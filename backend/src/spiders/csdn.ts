import * as fs from 'fs'
import * as path from 'path'
import BaseSpider from './base';

export default class CsdnSpider extends BaseSpider {

  // https://editor.csdn.net/md/?not_checkout=1
  async afterGoToEditor() {
    // 创建tmp临时文件夹
    const dirPath = path.resolve(path.join(__dirname, '..', 'tmp'))
    if (!fs.existsSync(dirPath)) {
      await fs.mkdirSync(dirPath)
    }

    // 内容
    const content = this.article.content + ''; // `\n\n> 本篇文章由一文多发平台[ArtiPub](https://github.com/crawlab-team/artipub)自动发布`

    // 写入临时markdown文件
    const mdPath = path.join(dirPath, `${this.article._id.toString()}.md`)
    await fs.writeFileSync(mdPath, content)

    // 上传markdown文件
    const handle = await this.page.$('input[accept=".md"]')
    await handle!.uploadFile(mdPath)
    await this.page.waitForTimeout(5000)

    // 删除临时markdown文件
    await fs.unlinkSync(mdPath)
  }

  async inputContent(article, editorSel) {
    // do nothing
  }

  async inputFooter(article, editorSel) {
    // do nothing
  }

  /**
   * 输入编辑器后续操作
   */
  async afterInputEditor() {
    // 输入编辑器内容的后续处理
    // 标签、分类输入放在这里
    // 发布文章
    // 选择文章类型
    // 点击发布文章
    const elPubBtn = await this.page.$('.btn-publish');
    this.logger.info('elPubBtn='+elPubBtn);
    await elPubBtn!.click();
    await this.page.waitForTimeout(2000);

    // 选择类别
    // await this.page.evaluate(() => {
    //   const element = document.querySelector('.textfield') as HTMLTextAreaElement;
    //   element.value = 'original';
    //   if ('createEvent' in document) {
    //     let evt = document.createEvent('HTMLEvents');
    //     evt.initEvent('change', false, true);
    //     element.dispatchEvent(evt);
    //   } else {
    //     //@ts-ignore
    //     element.fireEvent('onchange');
    //   }
    //   // document.querySelector('.textfield > option:nth-child(1)').removeAttribute('selected')
    // });

    const modalContent = await this.page.waitForSelector('.modal__content');
    await this.page.waitForTimeout(2000);
    this.logger.info('modalContent='+modalContent);
    if (modalContent) {
      const summaryBtn = await this.page.waitForSelector('button.btn-getdistill');
      this.logger.info('summaryBtn='+summaryBtn);
      await this.page.waitForTimeout(1000);
      await summaryBtn.click();
      await this.page.waitForTimeout(1000);
    }
    

    
    // button
    // const modealBtnBar = await this.page.waitForSelector('.modal__button-bar');
    // this.logger.info('modealBtnBar='+modealBtnBar);
    // await this.page.waitForTimeout(1000);

    //   // Click on the "保存为草稿" button
    // const btnDraft = await this.page.click('.modal__button-bar > button:nth-child(2)');
    // this.logger.info('btnDraft='+btnDraft);
    // await this.page.waitForTimeout(1000);

    // this.logger.info('保存草稿');

    // You can add some delay here if necessary to wait for the action to complete
    // await page.waitForTimeout(1000);

    // Click on the "发布文章" button
    // await this.page.click('.modal__button-bar > button:nth-child(4)');
    // 选择发布形式
    // https://mp.csdn.net/mp_blog/creation/success/137436834
    // https://editor.csdn.net/md/?articleId=137436834
    await this.page.evaluate(task => {
      const el = document.querySelector('#' + task.pubType) as HTMLInputElement;
      el.click();
      // Wait for the modal to appear
      
    }, this.task as any);
    // // button btn-b-red ml16
      
  }

  async afterPublish() {
    this.task.url = await this.page.evaluate(() => {
      const el = document.querySelector('.success-modal-footer a[nth-child(0)]');
      this.logger.info('csdn afterPublish: el='+el);
      return el!.getAttribute('href');
    }) as string;
    await this.task.save();
  }

  async fetchStats() {
    if (!this.task.url) return;
    await this.page.goto(this.task.url, { timeout: 60000 });
    await this.page.waitForTimeout(5000);

    const stats = await this.page.evaluate(() => {
      const text = document.querySelector('body')!.innerText;
      const mRead = text.match(/阅读数 (\d+)/);
      const readNum = mRead ? Number(mRead[1]) : 0;
      const likeNum = Number(document.querySelector<HTMLInputElement>('#supportCount')!.innerText);
      const commentNum = 0; // 暂时获取不了评论数
      return {
        readNum,
        likeNum,
        commentNum,
      };
    });
    this.task.readNum = stats.readNum;
    this.task.likeNum = stats.likeNum;
    this.task.commentNum = stats.commentNum;
    await this.task.save();
    await this.page.waitForTimeout(3000);
  }
}
