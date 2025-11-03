import re

# 파일 목록
files = [
    "components/chatbot/FavoritesSection.tsx",
    "components/chatbot/SessionItem.tsx",
    "app/chatbot/page.tsx"
]

for file_path in files:
    with open(f"d:/Projects/Statics/statistical-platform/{file_path}", 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Pin 아이콘을 import에 추가 (필요시)
    if "FavoritesSection" in file_path:
        content = re.sub(
            r"import { ChevronDown, ChevronRight }",
            "import { ChevronDown, ChevronRight, Pin }",
            content
        )
        # 📌 → <Pin className="..." />
        content = re.sub(
            r'<span className="text-muted-foreground">📌</span>',
            '<Pin className="h-4 w-4 text-muted-foreground" />',
            content
        )
    
    elif "SessionItem" in file_path:
        content = re.sub(
            r"import { FolderInput, Trash2 }",
            "import { FolderInput, Trash2, Pin, MapPin }",
            content
        )
        # 헤더의 핀 아이콘
        content = re.sub(
            r'<span className="text-muted-foreground flex-shrink-0">📌</span>',
            '<Pin className="h-3 w-3 text-muted-foreground flex-shrink-0" />',
            content
        )
        # 호버 버튼의 핀/위치핀
        content = re.sub(
            r'<span className="text-muted-foreground">\s*\{session\.isFavorite \? \'📌\' : \'📍\'\}\s*</span>',
            '{session.isFavorite ? (\n            <Pin className="h-3 w-3 text-muted-foreground" />\n          ) : (\n            <MapPin className="h-3 w-3 text-muted-foreground" />\n          )}',
            content
        )
        
        # 시간 표시 제거
        content = re.sub(
            r'        <p className="text-xs text-muted-foreground mt-0\.5">\s*\{formatRelativeTime\(session\.updatedAt\)\}\s*</p>',
            '',
            content
        )
    
    elif "page.tsx" in file_path:
        content = re.sub(
            r"import { Plus, Sparkles, ChevronLeft, ChevronRight, Edit2 }",
            "import { Plus, Sparkles, ChevronLeft, ChevronRight, Edit2, Pin }",
            content
        )
        # 메인 헤더의 핀 아이콘
        content = re.sub(
            r'<span className="text-muted-foreground flex-shrink-0">📌</span>',
            '<Pin className="h-4 w-4 text-muted-foreground flex-shrink-0" />',
            content
        )
    
    with open(f"d:/Projects/Statics/statistical-platform/{file_path}", 'w', encoding='utf-8') as f:
        f.write(content)

print("Pin icon update completed!")
