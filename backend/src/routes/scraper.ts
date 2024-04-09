import * as Result from '../utils/result'
import constants from '../constants'
import { Router } from 'express';
import {Article, IPlatform, Platform, Task} from '@/models'
import PCR = require( 'puppeteer-chromium-resolver');
import type { Page, Serializable } from 'puppeteer-core';
import logger from '../logger';
import log4js from 'log4js';
import data from '@/data';
import { first } from '@/utils';
import TurndownService = require("turndown")

const router = Router();
const ObjectId = require('bson').ObjectId

interface ArticleData {
    title: string;
    url: string;
    summary: string;
    cover: string;
    contentHtml: string;
    content: string;
  }
  class Scraper {
    spinner: any;
    // result: IResult | any;
    localSwaggerUrl: string;
  
    cwd: string;
    pcr: ReturnType<typeof PCR>;;
    logger: log4js.Logger;
    browser: any;
    page: Page;
  
    /**
     * yapi项目 前缀
     */
    pname: string;
  
    constructor(configOptions?: any ) {
    //   this.options = configOptions || {};
    //   this.result = null;
      this.localSwaggerUrl = '';
      this.pname = '';
      
      this.logger = logger;
      
      this.cwd = process.cwd();
    }

    init = async () => {
        this.pcr = await PCR({
            revision: '',
            detectionPath: '',
            folderName: '.chromium-browser-snapshots',
            hosts: ['https://storage.googleapis.com', 'https://registry.npmmirror.com/-/binary'],
            retry: 3,
            silent: false,
          });
     
        this.browser = await this.pcr.puppeteer.launch({
            executablePath: this.pcr.executablePath,
            //设置超时时间
            timeout: 120000,
            //如果是访问https页面 此属性会忽略https错误
            ignoreHTTPSErrors: true,
            // 打开开发者工具, 当此值为true时, headless总为false
            devtools: false,
            // 关闭headless模式, 不会打开浏览器
            headless: true,
            args: ["--no-sandbox", '--start-maximized'],
            defaultViewport: null,
      
          });
          this.page = await this.browser.newPage();
    }
    close = () => {
        this.browser.close();
    }
    scrapeArticles = async (
        pageUrl: string,
        titleSelector: string,
        summarySelector: string,
        coverSelector: string,
        contentSelector: string
      ): Promise<ArticleData[]> => {
        await this.page.goto(pageUrl, { waitUntil: 'networkidle2' });
      
        const articles = await this.page.evaluate(
          (titleSel, summarySel, coverSel) => {
            const articleElements = Array.from(document.querySelectorAll('article'));
            return articleElements.map(article => {
              const titleElement = article.querySelector(titleSel);
              const summaryElement = article.querySelector(summarySel);
              const coverElement = article.querySelector(coverSel);
      
              return {
                title: titleElement?.textContent?.trim() ?? '',
                url: titleElement?.getAttribute('href') ?? '',
                summary: summaryElement?.textContent?.trim() ?? '',
                cover: coverElement?.getAttribute('src') ?? '',
                contentHtml: '', // 初始为空，稍后填充
                content: '' // 初始为空，稍后填充
              };
            });
          },
          titleSelector,
          summarySelector,
          coverSelector
        );
      
        this.logger.info('获取文章列表结束')
        await this.page.waitForTimeout(5000)
        // 创建 Turndown 服务实例
        const turndownService = new TurndownService();
        
        // 循环遍历每篇文章，获取内容
        for (const article of articles) {
          if (article.url) {
            await this.page.goto(article.url, { waitUntil: 'networkidle2' });
            // const contentHtml = await this.page.$eval(contentSelector, el => el.innerHTML);
            // 获取页面内容
            const contentHtml = await this.page.evaluate((contentSelector) => {
              const content = document.querySelector(contentSelector);
              if (!content) {
                return '';
              }

              // 移除页面中的 <ins class="adsbygoogle">...</ins>
              const ads = content.querySelectorAll('ins.adsbygoogle');
              ads.forEach(ad => ad.remove());

              // 移除页面中的 <script>...</script>
              const scripts = content.querySelectorAll('script');
              scripts.forEach(script => script.remove());

              // 返回处理后的HTML内容
              return content.innerHTML;
            }, contentSelector);
            article.contentHtml = contentHtml;
            article.content = turndownService.turndown(contentHtml);
            await this.page.waitForTimeout(5000)
          }
          break;
        }
        return articles;
    }
  };  
  
  

const getScraperList = async (req, res) => {
  const crawltarget = first(data.crawltargets.filter(item=> item.name === req.body.name));
    // const tasks = await Task.find()
    // await Result.success(res, tasks)
    // const turndownService = new TurndownService();
    // turndownService.keep(['del', 'ins'])
    // const _html = turndownService.turndown('<p>Hello <del>world</del><ins>World</ins></p>') // 'Hello <del>world</del><ins>World</ins>'
    // console.log(_html);

    // return ;
    // 使用示例
    if (crawltarget) {
      const titleSelector = crawltarget.selector.title;
      const summarySelector = crawltarget.selector.summary;
      const coverSelector = crawltarget.selector.cover;
      const contentSelector = crawltarget.selector.content;
      const myScraper = new Scraper();
      await myScraper.init();
      const articles = await myScraper.scrapeArticles(crawltarget.url, titleSelector, summarySelector, coverSelector, contentSelector)
  
      console.log(articles);
      const fArticle = first(articles);
      if (fArticle) {
        // 创建文章
        let article = new Article({
          user: req.user._id,
          title: fArticle.title,
          content: fArticle.content,
          contentHtml: fArticle.contentHtml,
          platformIds: [],
        })
        article = await article.save()
        await Result.success(res, article)
      }
      
      myScraper.close();
      
      
    }
    else {
      await Result.error(res,'crawltarget not found');
    }
    
    
};
// router.get('/', getScraperList)

/**
 * 
 * import puppeteer from 'puppeteer';


interface ArticleData {
  title: string;
  url: string;
  summary: string;
  cover: string;
  contentHtml: string;
  content: string;
}

async function scrapeArticles(
  pageUrl: string,
  titleSelector: string,
  summarySelector: string,
  coverSelector: string,
  contentSelector: string
): Promise<ArticleData[]> {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(pageUrl, { waitUntil: 'networkidle2' });

  const articles = await page.evaluate(
    (titleSel, summarySel, coverSel) => {
      const articleElements = Array.from(document.querySelectorAll('article'));
      return articleElements.map(article => {
        const titleElement = article.querySelector(titleSel);
        const summaryElement = article.querySelector(summarySel);
        const coverElement = article.querySelector(coverSel);

        return {
          title: titleElement?.textContent?.trim() ?? '',
          url: titleElement?.getAttribute('href') ?? '',
          summary: summaryElement?.textContent?.trim() ?? '',
          cover: coverElement?.getAttribute('src') ?? '',
          contentHtml: '', // 初始为空，稍后填充
          content: '' // 初始为空，稍后填充
        };
      });
    },
    titleSelector,
    summarySelector,
    coverSelector
  );

  // 创建 Turndown 服务实例
  const turndownService = new TurndownService();

  // 循环遍历每篇文章，获取内容
  for (const article of articles) {
    if (article.url) {
      await page.goto(article.url, { waitUntil: 'networkidle2' });
      const contentHtml = await page.$eval(contentSelector, el => el.innerHTML);
      article.contentHtml = contentHtml;
      article.content = turndownService.turndown(contentHtml);
    }
  }

  await browser.close();
  return articles;
}

// 使用示例
const exampleUrl = 'http://example.com/articles'; // 替换为实际的文章列表页面 URL
const titleSelector = 'article h3.entry-title a';
const summarySelector = 'article div > p';
const coverSelector = 'article figure > a > img';
const contentSelector = 'div#main-content .entry-content.mh-clearfix';

scrapeArticles(exampleUrl, titleSelector, summarySelector, coverSelector, contentSelector)
  .then(articles => {
    console.log(articles);
  })
  .catch(error => {
    console.error('Scraping failed:', error);
  });

 */
router.post("/spider", getScraperList);

export = { router, basePath: '/scrapers', };