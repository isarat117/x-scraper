const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Klasördeki tüm CSV dosyalarını birleştiren fonksiyon
function mergeCSVFiles(folderPath, outputFile) {
    const outputData = [];

    fs.readdir(folderPath, (err, files) => {
        if (err) {
            console.error('Klasör okunurken bir hata oluştu:', err);
            return;
        }

        files.forEach(file => {
            const filePath = path.join(folderPath, file);
            if (path.extname(file).toLowerCase() === '.csv') {
                // CSV dosyasını oku ve veriyi birleştir
                const fileData = fs.readFileSync(filePath, 'utf8');
                const lines = fileData.trim().split('\n');
                lines.forEach(line => outputData.push(line));
            }
        });

        // Tüm dosyalar birleştirildikten sonra veriyi bir dosyaya yaz
        fs.writeFileSync(outputFile, outputData.join('\n'));
        console.log('CSV dosyaları birleştirildi.');
    });
}

// Kullanım örneği
const folderPath = './';
const outputFile = './allCsv.csv';
mergeCSVFiles(folderPath, outputFile);
