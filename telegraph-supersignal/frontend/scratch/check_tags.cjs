const fs = require('fs');
const file = process.argv[2] || 'src/App.tsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
let stack = [];

lines.forEach((line, i) => {
    // Regex to match tags while ignoring self-closing tags like <BackgroundAnimation /> or <Shield size={20} />
    // It should also ignore tags inside strings or comments if possible, but let's keep it simple.
    // We match <TAG and </TAG
    const tokens = line.match(/<(div|motion\.div|main|header|footer)\b| <\/(div|motion\.div|main|header|footer)>/g);
    
    // Better regex to match opening tags (not self-closing) and closing tags
    const re = /<(div|motion\.div|main|header|footer)\b(?![^>]*\/>)|<\/ (div|motion\.div|main|header|footer)>/g;
    
    // Let's use a simpler approach: find all occurrences of opening and closing tags
    const openTags = [...line.matchAll(/<(div|motion\.div|main|header|footer)\b(?![^>]*\/>)/g)];
    const closeTags = [...line.matchAll(/<\/(div|motion\.div|main|header|footer)>/g)];
    
    let lineTokens = [];
    openTags.forEach(m => lineTokens.push({ type: m[1], isClose: false, pos: m.index }));
    closeTags.forEach(m => lineTokens.push({ type: m[1], isClose: true, pos: m.index }));
    
    lineTokens.sort((a,b) => a.pos - b.pos).forEach(token => {
        if (token.isClose) {
            if (stack.length === 0) {
                 console.log(`Error at line ${i+1}: Unmatched closing tag </${token.type}>`);
            } else {
                const open = stack.pop();
                if (open.type !== token.type) {
                    console.log(`Error at line ${i+1}: Tag mismatch. Expected </${open.type}>, found </${token.type}>. Opened at line ${open.line}`);
                }
            }
        } else {
            stack.push({ type: token.type, line: i + 1 });
        }
    });
});

stack.reverse().forEach(unclosed => {
    console.log(`Unclosed tag <${unclosed.type}> opened at line ${unclosed.line}`);
});
