# 安全问题 / Security

## 报告方式 / How to report

请不要在公开 issue 里报告安全问题。请通过 GitHub 的私密漏洞报告提交：仓库页面 → Security → Report a vulnerability。

Please do not report security issues in public issues. Use GitHub's private vulnerability reporting instead: repository page → Security → Report a vulnerability.

我们会尽快回复。这是一个个人维护的项目，没有固定的响应时限。

We will reply as soon as we can. This is a personally maintained project without a guaranteed response time.

## 范围 / Scope

本站是纯静态网站：没有后端、没有账号、不收集用户数据，档案只存在浏览器的 localStorage。值得报告的问题包括：

The site is fully static: no backend, no accounts, no data collection; profiles live only in the browser's localStorage. Relevant reports include:

- 页面中的 XSS 或可被利用的跳转 / XSS or exploitable redirects in the site
- 依赖中影响本站的漏洞 / Vulnerabilities in dependencies that affect the site
- 仓库中意外提交的密钥或个人信息 / Secrets or personal data accidentally committed to the repository

数据错误（成分表、价格、证据等级等）不属于安全问题，请用"数据纠错"issue 模板。

Data errors (ingredient lists, prices, evidence levels) are not security issues; please use the data-correction issue template.
