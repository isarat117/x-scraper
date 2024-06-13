const fs = require('fs');
const path = require('path');

const klasorYolu = './'; // Klasör yolunu değiştirin

// Klasörü tara ve CSV dosyalarını sil
fs.readdir(klasorYolu, (err, files) => {
    if (err) {
        console.error('Klasör okunurken bir hata oluştu:', err);
        return;
    }

    files.forEach(file => {
        const dosyaYolu = path.join(klasorYolu, file);

        // Dosyanın bir CSV dosyası olup olmadığını kontrol et
        if (fs.statSync(dosyaYolu).isFile() && path.extname(file).toLowerCase() === '.csv') {
            // CSV dosyasını sil
            fs.unlink(dosyaYolu, err => {
                if (err) {
                    console.error(`${file} silinirken bir hata oluştu:`, err);
                } else {
                    console.log(`${file} başarıyla silindi.`);
                }
            });
        }
    });
});
