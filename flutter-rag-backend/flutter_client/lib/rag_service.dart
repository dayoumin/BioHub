/// Flutter용 RAG 클라이언트 SDK
///
/// 사용법:
/// ```dart
/// final ragService = RagService(baseUrl: 'http://localhost:8000');
/// final response = await ragService.query('통계 검정력이란?');
/// print(response.answer);
/// ```

import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;

// ===== 데이터 모델 =====

class QueryRequest {
  final String question;
  final List<Map<String, String>>? conversationHistory;
  final int? topK;

  QueryRequest({
    required this.question,
    this.conversationHistory,
    this.topK,
  });

  Map<String, dynamic> toJson() => {
        'question': question,
        'conversation_history': conversationHistory ?? [],
        'top_k': topK,
      };
}

class Source {
  final String title;
  final String content;
  final double score;

  Source({
    required this.title,
    required this.content,
    required this.score,
  });

  factory Source.fromJson(Map<String, dynamic> json) => Source(
        title: json['title'],
        content: json['content'],
        score: (json['score'] as num).toDouble(),
      );
}

class QueryResponse {
  final String answer;
  final List<Source> sources;
  final List<String> citedDocIds;
  final int responseTimeMs;

  QueryResponse({
    required this.answer,
    required this.sources,
    required this.citedDocIds,
    required this.responseTimeMs,
  });

  factory QueryResponse.fromJson(Map<String, dynamic> json) => QueryResponse(
        answer: json['answer'],
        sources: (json['sources'] as List)
            .map((s) => Source.fromJson(s))
            .toList(),
        citedDocIds: List<String>.from(json['cited_doc_ids']),
        responseTimeMs: json['response_time_ms'],
      );
}

class DocumentInput {
  final String title;
  final String content;
  final String? category;
  final Map<String, dynamic>? metadata;

  DocumentInput({
    required this.title,
    required this.content,
    this.category,
    this.metadata,
  });

  Map<String, dynamic> toJson() => {
        'title': title,
        'content': content,
        'category': category ?? 'general',
        'metadata': metadata ?? {},
      };
}

class DocumentResponse {
  final String docId;
  final String title;
  final String content;
  final String category;
  final String createdAt;

  DocumentResponse({
    required this.docId,
    required this.title,
    required this.content,
    required this.category,
    required this.createdAt,
  });

  factory DocumentResponse.fromJson(Map<String, dynamic> json) =>
      DocumentResponse(
        docId: json['doc_id'],
        title: json['title'],
        content: json['content'],
        category: json['category'],
        createdAt: json['created_at'],
      );
}

// ===== RAG 서비스 클래스 =====

class RagService {
  final String baseUrl;
  final http.Client _client;

  RagService({
    required this.baseUrl,
    http.Client? client,
  }) : _client = client ?? http.Client();

  /// 헬스 체크
  Future<Map<String, dynamic>> healthCheck() async {
    final response = await _client.get(Uri.parse(baseUrl));
    if (response.statusCode != 200) {
      throw Exception('Health check failed: ${response.statusCode}');
    }
    return json.decode(response.body);
  }

  /// RAG 쿼리 (일반)
  Future<QueryResponse> query(
    String question, {
    List<Map<String, String>>? conversationHistory,
    int? topK,
  }) async {
    final request = QueryRequest(
      question: question,
      conversationHistory: conversationHistory,
      topK: topK,
    );

    final response = await _client.post(
      Uri.parse('$baseUrl/api/query'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(request.toJson()),
    );

    if (response.statusCode != 200) {
      throw Exception('Query failed: ${response.body}');
    }

    return QueryResponse.fromJson(json.decode(response.body));
  }

  /// RAG 쿼리 (스트리밍)
  ///
  /// 사용 예제:
  /// ```dart
  /// await ragService.queryStream(
  ///   'T-검정이란?',
  ///   onChunk: (chunk) => print(chunk),
  ///   onSources: (sources) => print('참조: ${sources.length}개'),
  ///   onDone: () => print('완료'),
  /// );
  /// ```
  Future<void> queryStream(
    String question, {
    required void Function(String chunk) onChunk,
    void Function(List<Source> sources)? onSources,
    void Function()? onDone,
    List<Map<String, String>>? conversationHistory,
    int? topK,
  }) async {
    final request = QueryRequest(
      question: question,
      conversationHistory: conversationHistory,
      topK: topK,
    );

    final httpRequest = http.Request(
      'POST',
      Uri.parse('$baseUrl/api/query/stream'),
    );
    httpRequest.headers['Content-Type'] = 'application/json';
    httpRequest.body = json.encode(request.toJson());

    final streamedResponse = await _client.send(httpRequest);

    if (streamedResponse.statusCode != 200) {
      throw Exception('Stream query failed: ${streamedResponse.statusCode}');
    }

    // SSE 파싱
    await for (final chunk in streamedResponse.stream
        .transform(utf8.decoder)
        .transform(const LineSplitter())) {
      if (chunk.startsWith('data: ')) {
        final data = json.decode(chunk.substring(6));
        final type = data['type'];

        if (type == 'sources') {
          final sources = (data['data'] as List)
              .map((s) => Source.fromJson(s))
              .toList();
          onSources?.call(sources);
        } else if (type == 'chunk') {
          onChunk(data['data']);
        } else if (type == 'done') {
          onDone?.call();
          break;
        }
      }
    }
  }

  /// 문서 추가 (텍스트)
  Future<DocumentResponse> addDocument(DocumentInput doc) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/api/documents/add'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(doc.toJson()),
    );

    if (response.statusCode != 200) {
      throw Exception('Add document failed: ${response.body}');
    }

    return DocumentResponse.fromJson(json.decode(response.body));
  }

  /// 문서 업로드 (파일)
  Future<Map<String, dynamic>> uploadDocument(String filePath) async {
    final request = http.MultipartRequest(
      'POST',
      Uri.parse('$baseUrl/api/documents/upload'),
    );
    request.files.add(await http.MultipartFile.fromPath('file', filePath));

    final streamedResponse = await _client.send(request);
    final response = await http.Response.fromStream(streamedResponse);

    if (response.statusCode != 200) {
      throw Exception('Upload failed: ${response.body}');
    }

    return json.decode(response.body);
  }

  /// 문서 목록 조회
  Future<List<DocumentResponse>> listDocuments() async {
    final response = await _client.get(
      Uri.parse('$baseUrl/api/documents'),
    );

    if (response.statusCode != 200) {
      throw Exception('List documents failed: ${response.body}');
    }

    final data = json.decode(response.body);
    return (data['documents'] as List)
        .map((d) => DocumentResponse.fromJson(d))
        .toList();
  }

  /// 문서 삭제
  Future<Map<String, dynamic>> deleteDocument(String docId) async {
    final response = await _client.delete(
      Uri.parse('$baseUrl/api/documents/$docId'),
    );

    if (response.statusCode != 200) {
      throw Exception('Delete document failed: ${response.body}');
    }

    return json.decode(response.body);
  }

  /// 리소스 정리
  void dispose() {
    _client.close();
  }
}