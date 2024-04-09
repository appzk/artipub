/*
 * @Date: 2024-04-02 13:53:32
 * @LastEditors: roy fugangb@enn.cn
 * @LastEditTime: 2024-04-02 16:36:02
 * @FilePath: /artipub/backend/src/routes/cookie.ts
 * @Description: 
 * Copyright (c) 2024 by ygyg.cn, All Rights Reserved.
 */
import * as Result from '../utils/result'
import { Router } from 'express'
import { Cookie } from '@/models';
const router = Router();

const addCookies = async (req, res) => {
    const cookies = req.body
    for (let i = 0; i < cookies.length; i++) {
      const c = cookies[i]
      if (c.domain == 'aliyun' && c.domain != '.aliyun.com' && c.domain != 'developer.aliyun.com') {
        continue
      }
      let cookie = await Cookie.findOne({
        user: req.user._id,
        domain: c.domain,
        name: c.name
      })
      if (cookie) {
        // 已存在该cookie
        for (let k in c) {
          if (c.hasOwnProperty(k)) {
            cookie[k] = c[k]
          }
        }
      } else {
        // 不存在该cookie，新增
        console.log('c=', c , 'user=', req.user._id);
        cookie = new Cookie({ ...c, user: req.user._id })
      }
      await cookie.save()
    }
   Result.success(res);
  };

router.post('/', addCookies)

export = { router, basePath: '/cookies', };
