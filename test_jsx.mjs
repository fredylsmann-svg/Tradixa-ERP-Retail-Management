import fs from 'fs';
import { parse } from '@babel/parser';
const code = fs.readFileSync('src/pages/UserManagement.jsx', 'utf8');
try {
  parse(code, { sourceType: 'module', plugins: ['jsx'] });
  console.log("No syntax errors");
} catch(e) {
  console.log(e.message);
}
