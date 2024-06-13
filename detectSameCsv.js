const fs = require('fs');
const csv = require('csv-parser');
const fastcsv = require('fast-csv');

const csvFilePath = 'veri.csv'; // CSV dosyasının yolu
const outputFile = 'yeni_veri.csv'; // Tekrar edenlerin silinmiş hali için çıkış dosyası

const uniqueRows = new Set(); // Tekrar eden satırları takip etmek için bir küme

// CSV dosyasını oku ve tekrar eden satırları kaldır
fs.createReadStream(csvFilePath)
  .pipe(csv())
  .on('data', row => {
    const rowString = JSON.stringify(row); // Satırı bir dizeye dönüştür
    if (!uniqueRows.has(rowString)) {
      uniqueRows.add(rowString); // Eğer satır kümede yoksa, kümeye ekle
    }
  })
  .on('end', () => {
    console.log('Tekrar edenler silindi, yeni satır sayısı:', uniqueRows.size);

    // Yeni bir CSV dosyası oluştur ve başlık satırını yaz
    const writeStream = fs.createWriteStream(outputFile);
    const csvStream = fastcsv.format({ headers: true });
    csvStream.pipe(writeStream);

    // Tekrar edenler hariç tüm satırları yeni CSV dosyasına yaz
    for (const rowString of uniqueRows) {
      csvStream.write(JSON.parse(rowString));
    }

    csvStream.end();
    console.log('Yeni CSV dosyası oluşturuldu:', outputFile);
  });
