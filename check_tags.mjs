import fs from 'fs';
const code = fs.readFileSync('src/pages/UserManagement.jsx', 'utf8');

const opening = (code.match(/<DialogContent/g) || []).length;
const closing = (code.match(/<\/DialogContent>/g) || []).length;
console.log(`DialogContent: ${opening} open, ${closing} close`);

const opening2 = (code.match(/<Dialog/g) || []).length; // also counts DialogTitle etc. Let's be specific
const dialogOpen = (code.match(/<Dialog[ >]/g) || []).length;
const dialogClose = (code.match(/<\/Dialog>/g) || []).length;
console.log(`Dialog: ${dialogOpen} open, ${dialogClose} close`);
