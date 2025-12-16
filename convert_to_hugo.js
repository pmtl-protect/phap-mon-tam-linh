const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const TurndownService = require('turndown');

// CẤU HÌNH
const INPUT_DIR = './khoi_phuc_data';
const OUTPUT_DIR = './content/posts'; 

const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced'
});

async function convert() {
    if (!fs.existsSync(INPUT_DIR)) {
        console.error("❌ Không tìm thấy thư mục khoi_phuc_data!");
        return;
    }
    
    if (!fs.existsSync(OUTPUT_DIR)){
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const files = fs.readdirSync(INPUT_DIR).filter(file => file.endsWith('.html'));
    console.log(`🚀 Bắt đầu chuyển đổi lại ${files.length} bài viết (Đã bỏ dòng Nguồn)...`);

    let count = 0;
    files.forEach(file => {
        const contentHtml = fs.readFileSync(path.join(INPUT_DIR, file), 'utf8');
        const $ = cheerio.load(contentHtml);

        const title = $('h1').first().text().trim() || "Không tiêu đề";
        const originalUrl = $('a').first().attr('href') || "";
        
        // Xử lý đường dẫn tương đối cho Hugo
        let relativePath = "";
        try {
            if (originalUrl.startsWith('http')) {
                const urlObj = new URL(originalUrl);
                relativePath = urlObj.pathname; 
            } else {
                relativePath = originalUrl;
            }
        } catch (e) {
            relativePath = "";
        }

        let bodyHtml = $('div[style="white-space: pre-wrap;"]').html() || "";
        let markdownBody = turndownService.turndown(bodyHtml);
        const date = new Date().toISOString(); 

        let urlField = "";
        if (relativePath && relativePath.length > 1) {
            urlField = `url: "${relativePath}"`;
        }

        const frontMatter = `---
title: "${title.replace(/"/g, '\\"')}"
date: ${date}
draft: false
${urlField}
---
`; 

        const outputFilename = file.replace('.html', '.md');
        
        // --- SỬA Ở ĐÂY: Chỉ lấy nội dung, bỏ dòng Nguồn ---
        const finalContent = `${frontMatter}\n${markdownBody}`;
        // --------------------------------------------------

        fs.writeFileSync(path.join(OUTPUT_DIR, outputFilename), finalContent);
        
        count++;
        if(count % 500 === 0) console.log(`... Đã xong ${count} bài.`);
    });

    console.log(`🎉 HOÀN TẤT! Đã loại bỏ toàn bộ dòng nguồn trong ${count} bài.`);
}

convert();