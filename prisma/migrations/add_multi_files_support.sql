-- Create a junction table for many-to-many relationship between pages and files
CREATE TABLE page_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id INTEGER NOT NULL,
    file_id INTEGER NOT NULL,
    position INTEGER DEFAULT 0, -- 檔案在頁面中的順序
    is_primary BOOLEAN DEFAULT FALSE, -- 是否為主要檔案
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    
    UNIQUE(page_id, file_id) -- 防止重複關聯
);

-- Create index for better performance
CREATE INDEX idx_page_files_page_id ON page_files(page_id);
CREATE INDEX idx_page_files_file_id ON page_files(file_id);
