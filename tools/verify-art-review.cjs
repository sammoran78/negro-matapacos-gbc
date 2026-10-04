/* Exercise the art prototype in a real browser. Does not test a ROM. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const playwright=require(process.env.ART_PLAYWRIGHT_PATH||'playwright');
(async()=>{
  const browser=await playwright.chromium.launch({headless:true,channel:'msedge'});
  try {
    const page=await browser.newPage({viewport:{width:1280,height:1000}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const url=pathToFileURL(path.resolve(__dirname,'../assets/review.html')).href;
    for(const locale of ['en','es']){
      await page.goto(url);await page.waitForFunction(()=>Object.values(pictures).every(i=>i.complete&&i.naturalWidth));
      assert.equal(await page.locator('#startOption').isVisible(),false);
      await page.locator('[data-lang="'+locale+'"]').click();
      assert.equal(await page.locator('#startOption').textContent(),locale==='en'?'START GAME':'INICIAR JUEGO');
      await page.locator('#startOption').click();assert.equal(await page.evaluate(()=>screen),'controls');
      await page.locator('#startOption').click();assert.equal(await page.evaluate(()=>screen),'map');
      await page.locator('[data-node="4"]').click();assert.equal(await page.evaluate(()=>selected),0);
      assert.equal(await page.locator('#mapStatus').textContent(),locale==='en'?'LOCKED':'BLOQUEADO');
      for(let i=0;i<5;i++){
        assert.equal(await page.evaluate(()=>unlocked),i+1);
        await page.locator('#startOption').click();assert.equal(await page.evaluate(()=>screen),'stage');
        await page.locator('#rescue').click();
        assert.equal(await page.evaluate(()=>screen),i<4?'map':'finale');
      }
      await page.locator('#startOption').click();assert.equal(await page.evaluate(()=>finale),1);
      await page.locator('#startOption').click();assert.equal(await page.evaluate(()=>finale),2);
      await page.locator('#startOption').click();assert.equal(await page.evaluate(()=>unlocked),5);
      await page.locator('[data-node="0"]').click();await page.locator('#startOption').click();await page.locator('#rescue').click();
      assert.equal(await page.evaluate(()=>unlocked),5);
      await page.locator('#spriteSize').selectOption('24');
      await page.waitForFunction(()=>detailed.complete&&detailed.naturalWidth);
      assert.equal(await page.evaluate(()=>size),24);
      await page.locator('#flip').click();assert.equal(await page.evaluate(()=>left),true);
      for(const stage of ['alameda','campus','plaza','mapocho','moneda'])await page.locator('#depthStage').selectOption(stage);
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.resolve(__dirname,'../assets/review-validation.json'),JSON.stringify({passed:true,languages:['en','es'],checks:['explicit language gating','controls before world map','locked node rejection','five sequential rescues','three ending beats','replay preserves unlocks','24-pixel option','left facing','five depth studies'],browser_errors:errors},null,2));
    await page.screenshot({path:path.resolve(__dirname,'../assets/previews/review-browser.png')});
    console.log('Browser art review checks passed for English and Spanish.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
