const { Builder, By, Key, until } = require('selenium-webdriver');
const { writeFile, readFile } = require('fs').promises;
const fs = require('fs');
const CryptoDataDownloader = require('./getMexcData')

const config = {
  twitter: {
    username: '', // dummy x account username
    password: '', // dummy x account password
  },
  targetAccounts: [

    //{"twitterAccount":"username","coinName":"coinName"},
    //{"twitterAccount":"username","coinName":"coinName"},
   
  ],
};

async function scrapeTwitterAccounts(config) {
  for (const targetAccount of config.targetAccounts) {
    await scrapeTwitterAccount(config, targetAccount);
  }
}

async function scrapeTwitterAccount(config, targetAccount) {
  const driver = await new Builder().forBrowser('chrome').build();

  try {
    await driver.get('https://x.com/login');

    // Kullanıcı adı veya e-posta giriş kutusunu bekle
    await driver.wait(until.elementLocated(By.css('input[autocomplete="username"]')), 10000);

    // Kullanıcı adı veya e-posta giriş kutusuna yaz
    await driver.findElement(By.css('input[autocomplete="username"]')).sendKeys(config.twitter.username);

    // 2 saniye bekle
    await driver.sleep(2000);

    // "İleri" yazısına sahip span elementine tıkla
    await driver.findElement(By.xpath("//span[contains(text(), 'İleri')]")).click();

    // Şifre giriş kutusunu bekle
    await driver.wait(until.elementLocated(By.name('password')), 10000);

    // Şifre giriş kutusuna yaz
    await driver.findElement(By.name('password')).sendKeys(config.twitter.password);

    // 2 saniye bekle
    await driver.sleep(2000);

    // Giriş yap butonuna tıkla
    await driver.findElement(By.css('div[data-testid="LoginForm_Login_Button"]')).click();

    await driver.sleep(10000);

    // Hedef hesabın sayfasına git
    await redirectToAccount(driver, targetAccount);
  } finally {
    // Tarayıcıyı kapat
    await driver.quit();
  }
}

async function redirectToAccount(driver, targetAccount) {
  await driver.get(`https://x.com/${targetAccount.twitterAccount}`);

  await driver.sleep(5000);

  // 600 saniye boyunca tweetleri çek
  await scrapeTweets(driver, 100000000, targetAccount.coinName, targetAccount);
}

async function scrollDown(driver, distance) {
  await driver.executeScript(`window.scrollBy(0, ${ distance });`);
}

async function scrapeTweets(driver, duration, coinName, targetAccount) {
  let tweets = [];
  const startTime = new Date().getTime();
  let timeWithoutTweets = 0;
  let timer;

  const checkTimer = () => {
    console.log("Tweet gelmeyen toplam süre: ", timeWithoutTweets);

    if (timeWithoutTweets >= 120) {
      console.log("--------- Toplanacak tweetler bitti. Sıradaki coin'e geçiliyor ---------");
      tweets = [];
      clearInterval(timer);
      scrapeNextAccount(driver, coinName, targetAccount);

      return;
    }

    timeWithoutTweets++;
  };

  timer = setInterval(checkTimer, 1000);
  
  if (coinName === config.targetAccounts[0].coinName) {
    do {
      try {
        // Tweetleri bul
        const tweetElements = await driver.findElements(By.css('article[data-testid="tweet"]'));

        for (const tweetElement of tweetElements) {
          // Eğer retweet değilse tweet metnini al
          if (coinName === config.targetAccounts[0].coinName) {
            try {
              await tweetElement.findElement(By.css('span[data-testid="socialContext"]')); //retweet elementi
            } catch (error) {
              try {
                await tweetElement.findElement(By.css('div[data-testid="placementTracking"]')); //space elementi
              } catch (error) {
                let tweetTextElements =
                  await tweetElement.findElements(By.css('div[data-testid="tweetText"] span, div[data-testid="tweetText"] a, div[data-testid="tweetText"] span a'));
                let tweetText = [];
    
                for (const element of tweetTextElements) {
                    let text = await element.getText();
    
                    if (text.trim() !== '' && !tweetText.includes(text)) {
                        tweetText.push(text.trim());
                    }
                }
    
                tweetText = tweetText.join(' ');
    
                const tweetDate = await tweetElement.findElement(By.css('time')).getAttribute('datetime');
                const timestampDate = Date.parse(tweetDate);
                
                tweetText = tweetText.replace(/[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~\n]/g, '');

                const dateOfnewTweet = new Date(timestampDate);
                const today = new Date();
                const isSameYear = today.getFullYear() === dateOfnewTweet.getFullYear();
                const isSameMonth = today.getMonth() === dateOfnewTweet.getMonth();
                const isSameDayOfMonth = today.getDate() === dateOfnewTweet.getDate();
                const isToday = isSameYear && isSameMonth && isSameDayOfMonth;
    
                // Yeni tweeti kontrol et ve sadece yeni olanları ekle
                if (!tweets.some(tweet => tweet.tweetText === tweetText) && !isToday) {
                  const downloader = new CryptoDataDownloader(coinName, timestampDate);
                  const difference = await downloader.getDifference();

                  tweets.push({ tweetText, difference });
    
                  const newTweet = [{ tweetText, difference }];
                  const fileName = `./tweetData/${coinName}_${targetAccount.twitterAccount}_tweets.csv`;
                  
                  if (dateOfnewTweet.getFullYear() > 2022) {
                    if(difference){
                      await appendToCsv(newTweet, fileName, coinName);
                      timeWithoutTweets = 0;
                      clearInterval(timer);
                      timer = setInterval(checkTimer, 1000);
                    }
                  } else {
                    console.log("--------- 2023 tweetleri bitti. Sıradaki coin'e geçiliyor ---------");

                    tweets = [];
                    clearInterval(timer);
                    scrapeNextAccount(driver, coinName, targetAccount);
                    break;
                  }
                }
              }
            }
          }
        }

        if (coinName === config.targetAccounts[0].coinName) {
          // 1 saniye bekle
          await driver.sleep(1000);

          // Scroll down işlemi
          await scrollDown(driver, 900);
        }
        
      } catch (error) {

      }
    } while ((new Date().getTime()) - startTime < duration);
  }
  
  clearInterval(timer); // loop bittiğinde timer'ı temizle

  return tweets;
}

async function scrapeNextAccount(driver) {
  config.targetAccounts.shift();

  if (config.targetAccounts.length > 0) {
    const nextAccount = config.targetAccounts[0];

    await redirectToAccount(driver, nextAccount);
  } else {
    console.log('\n\n===============================================================================\n========= Tüm hedef hesaplar için tweet toplama işlemi tamamlandı. ============\n===============================================================================\n\n');
    await driver.quit();
    process.exit(0);
  }
}

async function appendToCsv(newTweets, fileName, coinName) {
  // Önce dosyadaki mevcut verileri alın
  let existingTweets = [];

  if (fs.existsSync(fileName)) {
    try {
      const fileContent = await readFile(fileName, 'utf8');
      existingTweets = fileContent.trim().split('\n').map(line => {
        const [coinName, tweetText, difference] = line.split(',');

        return { coinName, tweetText, difference: parseFloat(difference) };
      });
    } catch (error) {
      // Dosya okunamazsa, mevcut tweetler boş kalır
    }
  }

  // Yeni tweetlerle eski tweetleri birleştirin
  const allTweets = [...existingTweets, ...newTweets];

  // Tekrar CSV dosyasına yaz
  const excelData = allTweets.map(tweet => `${coinName},${tweet.tweetText},${tweet.difference}`).join('\n');

  await writeFile(fileName, excelData, 'utf8');
  
  // Dosyayı kapat
  // Eğer dosya kapatma hatası alıyorsanız, dosyanın zaten kapalı olduğundan emin olun
  console.log(`Veriler başarıyla dosyaya eklendi. Toplanan toplam tweet sayısı: ${ allTweets.length }`);
}

// Fonksiyonu çalıştır
scrapeTwitterAccounts(config);