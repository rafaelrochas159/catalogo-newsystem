// fix-types.js - Script para corrigir inconsistências de tipos
const fs = require('fs');
const path = require('path');

// Mapeamento de correções
const replacements = [
  // Tipos
  { from: 'Produto', to: 'Product', regex: /\bProduto\b/g },
  
  // Propriedades comuns que podem estar em português
  { from: /\.nome\b/g, to: '.name', regex: /\.nome\b/g },
  { from: /\.descricao\b/g, to: '.description', regex: /\.descricao\b/g },
  { from: /\.preco\b/g, to: '.price', regex: /\.preco\b/g },
  { from: /\.precoUnitario\b/g, to: '.unitPrice', regex: /\.precoUnitario\b/g },
  { from: /\.precoCaixa\b/g, to: '.boxPrice', regex: /\.precoCaixa\b/g },
  { from: /\.quantidadeCaixa\b/g, to: '.boxQuantity', regex: /\.quantidadeCaixa\b/g },
  { from: /\.categoria\b/g, to: '.category', regex: /\.categoria\b/g },
  { from: /\.imagem\b/g, to: '.image', regex: /\.imagem\b/g },
  { from: /\.imagens\b/g, to: '.images', regex: /\.imagens\b/g },
  { from: /\.ativo\b/g, to: '.active', regex: /\.ativo\b/g },
  { from: /\.destaque\b/g, to: '.featured', regex: /\.destaque\b/g },
  { from: /\.criadoEm\b/g, to: '.createdAt', regex: /\.criadoEm\b/g },
  { from: /\.atualizadoEm\b/g, to: '.updatedAt', regex: /\.atualizadoEm\b/g },
  
  // Também verificar se há propriedades em português nos objetos
  { from: 'nome:', to: 'name:', regex: /\bnome:/g },
  { from: 'descricao:', to: 'description:', regex: /\bdescricao:/g },
  { from: 'preco:', to: 'price:', regex: /\bpreco:\b/g },
  { from: 'precoUnitario:', to: 'unitPrice:', regex: /\bprecoUnitario:/g },
  { from: 'precoCaixa:', to: 'boxPrice:', regex: /\bprecoCaixa:/g },
  { from: 'quantidadeCaixa:', to: 'boxQuantity:', regex: /\bquantidadeCaixa:/g },
  { from: 'categoria:', to: 'category:', regex: /\bcategoria:/g },
  { from: 'imagem:', to: 'image:', regex: /\bimagem:/g },
  { from: 'imagens:', to: 'images:', regex: /\bimagens:/g },
  { from: 'ativo:', to: 'active:', regex: /\bativo:/g },
  { from: 'destaque:', to: 'featured:', regex: /\bdestaque:/g },
  { from: 'criadoEm:', to: 'createdAt:', regex: /\bcriadoEm:/g },
  { from: 'atualizadoEm:', to: 'updatedAt:', regex: /\batualizadoEm:/g },
];

// Extensões de arquivo para processar
const extensions = ['.ts', '.tsx', '.js', '.jsx'];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let changes = [];

  replacements.forEach(({ from, to, regex }) => {
    const matches = content.match(regex);
    if (matches) {
      content = content.replace(regex, to);
      modified = true;
      changes.push(`${from} → ${to} (${matches.length}x)`);
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${filePath}`);
    changes.forEach(c => console.log(`   ${c}`));
    return true;
  }
  return false;
}

function walkDir(dir) {
  let filesModified = 0;
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('.next')) {
      filesModified += walkDir(fullPath);
    } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
      if (processFile(fullPath)) {
        filesModified++;
      }
    }
  }
  
  return filesModified;
}

console.log('🔧 Iniciando correção de tipos...\n');
const total = walkDir('./');
console.log(`\n✨ Total de arquivos modificados: ${total}`);
console.log('\n📝 Próximos passos:');
console.log('1. Verifique se há erros restantes: npm run build');
console.log('2. Se ainda houver erros, execute: npx tsc --noEmit');
console.log('3. Faça o deploy na Vercel');