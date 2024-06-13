const axios = require('axios');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

class CryptoDataDownloader {
    constructor(coinName, time) {
        this.coinName = coinName;
        this.time = parseInt(time);
        this.minute = new Date(this.time).getMinutes();
        this.remainder = this.minute % 5;
        this.requestNumber = 0
       
        this.setProperties();
    }

    setProperties() {
        const newTime = new Date(this.time);
        const today = new Date()
        this.timeOffSet = today.getTimezoneOffset()/3
        this.year = newTime.getFullYear().toString();
        this.month = this.editDate(newTime.getMonth());
        this.day = this.editDate(newTime.getDate());
        this.hour = newTime.getHours()

        if (this.isSameMonth(this.time)) {
            //Gün için
            if(this.hour>=16-this.timeOffSet)
            {
            this.url = `https://d2s4an60yebwep.cloudfront.net/SPOT/kline/${this.coinName}_USDT/daily/Min5/${this.coinName}_USDT-Min5-${this.year}-${this.month}-${this.day}.csv`;
            this.path = `csvDatas/${this.coinName}/Min5-${this.year}-${this.month}-${this.day}.csv`;

            }else{
                newTime.setDate(newTime.getDate()-1)
                this.year = newTime.getFullYear().toString();
                this.month = this.editDate(newTime.getMonth());
                this.day = this.editDate(newTime.getDate());
                this.url = `https://d2s4an60yebwep.cloudfront.net/SPOT/kline/${this.coinName}_USDT/daily/Min5/${this.coinName}_USDT-Min5-${this.year}-${this.month}-${this.day}.csv`;
                this.path = `csvDatas/${this.coinName}/Min5-${this.year}-${this.month}-${this.day}.csv`;
            }
           
        } else {
            //Ay için
            if(this.hour>=16-this.timeOffSet)
            {
                
            this.url = `https://d2s4an60yebwep.cloudfront.net/SPOT/kline/${this.coinName}_USDT/monthly/Min5/${this.coinName}_USDT-Min5-${this.year}-${this.month}.csv`;
            this.path = `csvDatas/${this.coinName}/Min5-${this.year}-${this.month}.csv`;

            }else{
                newTime.setDate(newTime.getDate()-1)
                this.year = newTime.getFullYear().toString();
                this.month = this.editDate(newTime.getMonth());
                this.day = this.editDate(newTime.getDate());
                this.url = `https://d2s4an60yebwep.cloudfront.net/SPOT/kline/${this.coinName}_USDT/monthly/Min5/${this.coinName}_USDT-Min5-${this.year}-${this.month}.csv`;
            this.path = `csvDatas/${this.coinName}/Min5-${this.year}-${this.month}.csv`;
            }

            }
            
    }
    
    isSameMonth(timestamp) {
        const time = new Date(timestamp);
        const currentTime = new Date();
        const currentMonth = currentTime.getMonth();
        const currentYear = currentTime.getFullYear()
        const timeMonth = time.getMonth();
        const timeYear = time.getFullYear();
        return currentMonth === timeMonth && timeYear === currentYear ;
    }

    editDate(number) {
        number = number + 1;
        if (number < 10) {
            return "0" + number;
        } else {
            return number.toString();
        }
    }

    async downloadCsv() {
        try {
           
            const hour = new Date(this.time).getHours();
            
            let response = await axios.get(this.url);
    
            fs.mkdir(`csvDatas/${this.coinName}`, { recursive: true }, (err) => {
                if (err) {
                    console.log(err);
                } else {
                    fs.writeFileSync(this.path, "coinName,interval,openTime,openPrice,highPrice,lowPrice,closePrice,volumeCoin,volumeUsdt,closeTime" + response.data);
                    console.log(`${this.path}  dosyası indirildi`)
                }
            });
        } catch (error) {
            console.error('CSV dosyası indirme hatası:', error.message);
        }
    }
    
    async getData() {
        return new Promise((resolve, reject) => {
            const newTimeBefore = this.time - this.remainder * 60000;
            const newTimeAfter = newTimeBefore + 5 * 60000;
            const zeroSecondsTimeBefore = new Date(newTimeBefore);
            zeroSecondsTimeBefore.setSeconds(0);
            zeroSecondsTimeBefore.setMilliseconds(0);
            const zeroSecondsTimeAfter = new Date(newTimeAfter);
            zeroSecondsTimeAfter.setSeconds(0);
            zeroSecondsTimeAfter.setMilliseconds(0);
    
            const data1 = [];
            try {
                fs.createReadStream(this.path)
                    .pipe(csv())
                    .on('data', (row) => {
                        if (row["openTime"] == zeroSecondsTimeBefore.getTime().toString()) {
                            data1.push(row["openPrice"]);
                        }
                    })
                    .on('end', () => {
                        fs.createReadStream(this.path)
                            .pipe(csv())
                            .on('data', (row) => {
                                if (row["openTime"] == zeroSecondsTimeAfter.getTime()) {
                                    data1.push(row["closePrice"]);
                                }
                            })
                            .on('end', () => {
                                resolve(data1);
                            });
                    });
            } catch (error) {
                reject(error);
            }
        });
    }

    async getDifference() {
        try {
            const isFileExists = await new Promise((resolve, reject) => {
                fs.access(this.path, (err) => {
                    if (err) {
                        console.error(`"${this.path}" mevcut değil.`);
                       
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                });
            });
            
            if (!isFileExists ) {
                await this.downloadCsv();
                this.requestNumber++
                if (isFileExists || this.requestNumber < 5) {
                    return await this.getDifference()
                } else {
                    return false
                }
            } else {
                const data = await this.getData();
                return calculatePercentageDifference(data);
            }
        } catch (error) {
            console.error('Bir hata oluştu:', error.message);
        }
    }
}

function calculatePercentageDifference(values) {
   
    const [value1, value2] = values;
    const percentage = (value2-value1)/value1 * 100;
    return percentage
}



module.exports = CryptoDataDownloader;