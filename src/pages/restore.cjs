const fs = require('fs');
let content = fs.readFileSync('D:/THEJA/ADVOCATE MANAGEMENT SYSTEM/Frontend/src/pages/CaseApproval.jsx.bak', 'utf8');

// Strip the view_file header
const lines = content.split('\n');
const startIndex = lines.findIndex(l => l.startsWith('1: import React') || l.startsWith('1: import {') || l.includes('import React'));
if (startIndex !== -1) {
    const cleanLines = lines.slice(startIndex).map(l => {
        const match = l.match(/^\d+:\s?(.*)$/);
        return match ? match[1] : l;
    });
    content = cleanLines.join('\n');
} else {
    // If we didn't find the line numbers pattern, maybe it doesn't have it.
    console.log("No line numbers found.");
}

// Write the original cleanly
fs.writeFileSync('D:/THEJA/ADVOCATE MANAGEMENT SYSTEM/Frontend/src/pages/CaseApproval.jsx', content);
console.log("Written clean file.");
