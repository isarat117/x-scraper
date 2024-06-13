const { Builder, By, Key, until } = require('selenium-webdriver');
const axios = require('axios');
const fs = require('fs');

const openDriver=async()=>{
    try {
        const driver = await new Builder().forBrowser('chrome').build();
        await getAdress(driver)
    } finally {
        await driver.quit();
    }
    

}




const getAdress =async(driver)=>{
    

    
    try {
        for(const coinInfo of coinInfos){
            await driver.get(`https://coinmarketcap.com/currencies/${coinInfo.adres}/`);
            
            try {
                await driver.wait(until.elementLocated(By.css('div[data-role="stats-block"] div[data-role="body"] a[href^="https://twitter.com"]')), 3000)
    
                const link = await driver.findElement(By.css('div[data-role="stats-block"] div[data-role="body"] a[href^="https://twitter.com"]')).getAttribute('href');
                const twitterKismi = link.substring("https://twitter.com/".length);
                adresses = {
                    twitterAccount:twitterKismi, 
                    'coinName':coinInfo.coinName
                }
                fs.appendFileSync('liste.txt', `${JSON.stringify(adresses)},\n`);
                console.log(adresses)
                await driver.sleep(2000);
            } catch (error) {
                console.log(error)
            }

            

        }
        



        
    } catch (error) {
        console.log(error)
        
    }
}
openDriver()


