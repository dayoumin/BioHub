"""
Flutter용 RAG 백엔드 서버 (FastAPI)

기능:
- 하이브리드 검색 (Keyword + Semantic)
- Ollama 로컬 LLM 통합
- 스트리밍 답변 (SSE)
- 문서 CRUD
- ChromaDB Vector Store
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import json
import asyncio
from datetime import datetime

# Langchain imports
from langchain_community.vectorstores import Chroma
from langchain_ollama import OllamaEmbeddings, ChatOllama
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferMemory
from langchain.retrievers import EnsembleRetriever
from langchain.retrievers import BM25Retriever
from langchain_core.documents import Document
from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    UnstructuredMarkdownLoader,
)

# ===== FastAPI 앱 생성 =====
app = FastAPI(
    title="RAG Backend for Flutter",
    description="하이브리드 검색 + Ollama + ChromaDB",
    version="1.0.0",
)

# CORS 설정 (Flutter 앱에서 접근 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션: Flutter 앱 도메인만 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== 설정 =====
OLLAMA_ENDPOINT = os.getenv("OLLAMA_ENDPOINT", "http://localhost:11434")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "mxbai-embed-large")
INFERENCE_MODEL = os.getenv("INFERENCE_MODEL", "llama3.3:latest")
CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", "./chroma_db")
TOP_K = int(os.getenv("TOP_K", "5"))

# ===== 전역 변수 =====
embeddings = None
vectorstore = None
llm = None


# ===== Pydantic 모델 =====
class QueryRequest(BaseModel):
    question: str
    conversation_history: Optional[List[Dict[str, str]]] = []
    top_k: Optional[int] = TOP_K


class QueryResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]]
    cited_doc_ids: List[str]
    response_time_ms: int


class DocumentInput(BaseModel):
    title: str
    content: str
    category: Optional[str] = "general"
    metadata: Optional[Dict[str, Any]] = {}


class DocumentResponse(BaseModel):
    doc_id: str
    title: str
    content: str
    category: str
    created_at: str


# ===== 초기화 함수 =====
@app.on_event("startup")
async def startup_event():
    """서버 시작 시 RAG 시스템 초기화"""
    global embeddings, vectorstore, llm

    print(f"[RAG Server] 초기화 중...")
    print(f"  - Ollama: {OLLAMA_ENDPOINT}")
    print(f"  - Embedding: {EMBEDDING_MODEL}")
    print(f"  - LLM: {INFERENCE_MODEL}")
    print(f"  - ChromaDB: {CHROMA_DB_PATH}")

    # Ollama 임베딩 모델
    embeddings = OllamaEmbeddings(
        base_url=OLLAMA_ENDPOINT,
        model=EMBEDDING_MODEL,
    )

    # ChromaDB Vector Store
    vectorstore = Chroma(
        persist_directory=CHROMA_DB_PATH,
        embedding_function=embeddings,
        collection_name="rag_documents",
    )

    # Ollama LLM
    llm = ChatOllama(
        base_url=OLLAMA_ENDPOINT,
        model=INFERENCE_MODEL,
        temperature=0.7,
    )

    print(f"[RAG Server] 초기화 완료! (문서 수: {vectorstore._collection.count()})")


# ===== API 엔드포인트 =====


@app.get("/")
async def root():
    """헬스 체크"""
    doc_count = vectorstore._collection.count() if vectorstore else 0
    return {
        "status": "ok",
        "service": "RAG Backend for Flutter",
        "ollama_endpoint": OLLAMA_ENDPOINT,
        "embedding_model": EMBEDDING_MODEL,
        "inference_model": INFERENCE_MODEL,
        "document_count": doc_count,
    }


@app.post("/api/query", response_model=QueryResponse)
async def query_rag(request: QueryRequest):
    """RAG 쿼리 (일반)"""
    start_time = datetime.now()

    # Semantic Retriever (Vector Search)
    semantic_retriever = vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs={"k": request.top_k},
    )

    # Keyword Retriever (BM25)
    all_docs = vectorstore.get()["documents"]
    all_docs_obj = [Document(page_content=doc) for doc in all_docs]
    keyword_retriever = BM25Retriever.from_documents(all_docs_obj)
    keyword_retriever.k = request.top_k

    # Hybrid Retriever (Ensemble)
    hybrid_retriever = EnsembleRetriever(
        retrievers=[semantic_retriever, keyword_retriever],
        weights=[0.5, 0.5],  # Semantic 50% + Keyword 50%
    )

    # 검색 실행
    retrieved_docs = hybrid_retriever.get_relevant_documents(request.question)

    # 컨텍스트 생성
    context = "\n\n".join([doc.page_content for doc in retrieved_docs[:request.top_k]])

    # 프롬프트 생성
    prompt = f"""다음 문서를 참고하여 질문에 답변하세요. 답변 시 [1], [2] 형태로 문서를 인용하세요.

참고 문서:
{context}

질문: {request.question}

답변:"""

    # LLM 호출
    response = await llm.ainvoke(prompt)
    answer = response.content

    # 응답 생성
    sources = [
        {
            "title": doc.metadata.get("title", "Unknown"),
            "content": doc.page_content[:200],
            "score": 1.0,  # ChromaDB는 score 미제공
        }
        for doc in retrieved_docs[:request.top_k]
    ]

    cited_doc_ids = [doc.metadata.get("doc_id", "") for doc in retrieved_docs[:request.top_k]]

    response_time_ms = int((datetime.now() - start_time).total_seconds() * 1000)

    return QueryResponse(
        answer=answer,
        sources=sources,
        cited_doc_ids=cited_doc_ids,
        response_time_ms=response_time_ms,
    )


@app.post("/api/query/stream")
async def query_rag_stream(request: QueryRequest):
    """RAG 쿼리 (스트리밍)"""

    async def generate():
        # Retriever 설정 (query_rag와 동일)
        semantic_retriever = vectorstore.as_retriever(
            search_type="similarity",
            search_kwargs={"k": request.top_k},
        )

        all_docs = vectorstore.get()["documents"]
        all_docs_obj = [Document(page_content=doc) for doc in all_docs]
        keyword_retriever = BM25Retriever.from_documents(all_docs_obj)
        keyword_retriever.k = request.top_k

        hybrid_retriever = EnsembleRetriever(
            retrievers=[semantic_retriever, keyword_retriever],
            weights=[0.5, 0.5],
        )

        # 검색 실행
        retrieved_docs = hybrid_retriever.get_relevant_documents(request.question)
        context = "\n\n".join([doc.page_content for doc in retrieved_docs[:request.top_k]])

        # Sources 먼저 전송
        sources = [
            {
                "title": doc.metadata.get("title", "Unknown"),
                "content": doc.page_content[:200],
                "score": 1.0,
            }
            for doc in retrieved_docs[:request.top_k]
        ]
        yield f"data: {json.dumps({'type': 'sources', 'data': sources})}\n\n"

        # 프롬프트
        prompt = f"""다음 문서를 참고하여 질문에 답변하세요. 답변 시 [1], [2] 형태로 문서를 인용하세요.

참고 문서:
{context}

질문: {request.question}

답변:"""

        # LLM 스트리밍
        async for chunk in llm.astream(prompt):
            text = chunk.content
            yield f"data: {json.dumps({'type': 'chunk', 'data': text})}\n\n"
            await asyncio.sleep(0.01)  # 부드러운 스트리밍

        # 완료 신호
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    """문서 업로드 (PDF, TXT, Markdown)"""
    try:
        # 임시 파일 저장
        temp_path = f"/tmp/{file.filename}"
        with open(temp_path, "wb") as f:
            content = await file.read()
            f.write(content)

        # 파일 타입별 로더 선택
        if file.filename.endswith(".pdf"):
            loader = PyPDFLoader(temp_path)
        elif file.filename.endswith(".md"):
            loader = UnstructuredMarkdownLoader(temp_path)
        else:
            loader = TextLoader(temp_path)

        # 문서 로드
        docs = loader.load()

        # 텍스트 청킹
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
        )
        chunks = text_splitter.split_documents(docs)

        # 메타데이터 추가
        for chunk in chunks:
            chunk.metadata["title"] = file.filename
            chunk.metadata["created_at"] = datetime.now().isoformat()

        # Vector Store 추가
        vectorstore.add_documents(chunks)

        # 파일 삭제
        os.remove(temp_path)

        return {
            "status": "success",
            "filename": file.filename,
            "chunks": len(chunks),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/documents/add", response_model=DocumentResponse)
async def add_document(doc: DocumentInput):
    """문서 추가 (텍스트 직접 입력)"""
    try:
        # 텍스트 청킹
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
        )
        chunks = text_splitter.split_text(doc.content)

        # Document 객체 생성
        doc_id = f"doc_{datetime.now().timestamp()}"
        docs = [
            Document(
                page_content=chunk,
                metadata={
                    "doc_id": doc_id,
                    "title": doc.title,
                    "category": doc.category,
                    "created_at": datetime.now().isoformat(),
                    **doc.metadata,
                },
            )
            for chunk in chunks
        ]

        # Vector Store 추가
        vectorstore.add_documents(docs)

        return DocumentResponse(
            doc_id=doc_id,
            title=doc.title,
            content=doc.content[:500],
            category=doc.category,
            created_at=datetime.now().isoformat(),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/documents")
async def list_documents():
    """문서 목록 조회"""
    try:
        all_data = vectorstore.get()
        metadatas = all_data.get("metadatas", [])

        # doc_id별로 그룹화 (중복 제거)
        docs_dict = {}
        for meta in metadatas:
            doc_id = meta.get("doc_id", "")
            if doc_id and doc_id not in docs_dict:
                docs_dict[doc_id] = {
                    "doc_id": doc_id,
                    "title": meta.get("title", "Unknown"),
                    "category": meta.get("category", "general"),
                    "created_at": meta.get("created_at", ""),
                }

        return {"documents": list(docs_dict.values())}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/documents/{doc_id}")
async def delete_document(doc_id: str):
    """문서 삭제"""
    try:
        # doc_id에 해당하는 모든 청크 삭제
        all_data = vectorstore.get()
        ids_to_delete = []

        for i, meta in enumerate(all_data.get("metadatas", [])):
            if meta.get("doc_id") == doc_id:
                ids_to_delete.append(all_data["ids"][i])

        if ids_to_delete:
            vectorstore._collection.delete(ids=ids_to_delete)
            return {"status": "success", "deleted_chunks": len(ids_to_delete)}
        else:
            raise HTTPException(status_code=404, detail="Document not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===== 실행 =====
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # 개발 시 자동 재시작
    )