/**
 * AutoCustomer — Seed Data Script
 * 生成丰富的模拟数据，让所有页面都有内容可展示
 *
 * 运行: npx tsx prisma/seed.ts
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// ============================================================
// 1. User (管理员)
// ============================================================
async function seedUser() {
  console.log("👤 Creating user...");
  const user = await db.users.upsert({
    where: { email: "admin@autocustomer.dev" },
    update: {},
    create: {
      id: crypto.randomUUID(),
      email: "admin@autocustomer.dev",
      name: "AutoCustomer Admin",
      role: "ADMIN",
      updatedAt: new Date(),
      preferences: {
        language: "zh-CN",
        timezone: "Asia/Shanghai",
        theme: "system",
        notifications: true,
        autoAnalyze: true,
        defaultEmailTemplate: "cold-outreach",
      },
    },
  });
  console.log(`   ✅ ${user.name} (${user.id})`);
  return user;
}

// ============================================================
// 2. Developers (GitHub 开发者候选人)
// ============================================================
async function seedDevelopers() {
  console.log("\n👨‍💻 Creating developers...");

  const developers = [
    {
      githubId: "github001", username: "sarahchen-dev", displayName: "Sarah Chen",
      bio: "Full-stack developer specializing in React/Node.js. Open source contributor to React Query and TanStack Table. Love building developer tools.",
      avatarUrl: "https://avatars.githubusercontent.com/u/1?v=4", location: "San Francisco, CA", company: null,
      blog: "https://sarahchen.dev", skillTags: "React,TypeScript,Node.js,GraphQL,TailwindCSS",
      techStack: "React,Next.js,Node.js,PostgreSQL,Prisma,Docker,AWS",
      languageStats: { TypeScript: 72, JavaScript: 18, Python: 6, Rust: 4 },
      overallScore: 8.7, activityScore: 9.2, expertiseScore: 8.5, fitScore: 8.4,
      status: "CONVERTED", priority: "HIGH",
      profileAnalysis: { summary: "顶级全栈开发者，React 生态深度贡献者", strengths: ["React 生态专家", "开源活跃", "技术写作"], weaknesses: [], recommendation: "强烈推荐招募" },
      notes: "已发 Offer，等待回复中。对 AI 工具方向很感兴趣。", assignedTo: "admin@autocustomer.dev",
    },
    {
      githubId: "github002", username: "mike-zhang", displayName: "Mike Zhang",
      bio: "Backend engineer @ former Big Tech. Distributed systems, Go, Kubernetes. Building reliable infrastructure at scale.",
      avatarUrl: "https://avatars.githubusercontent.com/u/2?v=4", location: "Seattle, WA", company: null,
      blog: null, skillTags: "Go,Rust,Kubernetes,Docker,PostgreSQL",
      techStack: "Go,Rust,Kubernetes,gRPC,Redis,ClickHouse",
      languageStats: { Go: 65, Rust: 20, Python: 10, Shell: 5 },
      overallScore: 8.9, activityScore: 7.8, expertiseScore: 9.5, fitScore: 8.6,
      status: "INTERESTED", priority: "URGENT",
      profileAnalysis: { summary: "后端系统架构师级别", strengths: ["分布式系统经验丰富", "Go/Rust 双修", "K8s 深度实践"], weaknesses: ["前端经验较少"], recommendation: "核心岗位优先" },
      notes: "已安排下周三技术面试，准备考察系统设计能力。", assignedTo: "admin@autocustomer.dev",
    },
    {
      githubId: "github003", username: "emma-wang-oss", displayName: "Emma Wang",
      bio: "AI/ML Engineer. Passionate about LLM applications, RAG pipelines, and making AI accessible. Former research intern at a top AI lab.",
      avatarUrl: "https://avatars.githubusercontent.com/u/3?v=4", location: "New York, NY", company: null,
      blog: "https://emma-ai.blog", skillTags: "Python,PyTorch,LLM,RAG,LlamaIndex",
      techStack: "Python,PyTorch,LangChain,FastAPI,Docker",
      languageStats: { Python: 85, TypeScript: 8, Shell: 4, YAML: 3 },
      overallScore: 9.1, activityScore: 8.0, expertiseScore: 9.3, fitScore: 9.0,
      status: "APPROVED", priority: "HIGH",
      profileAnalysis: { summary: "AI/ML 领域新星，LLM 应用实战经验突出", strengths: ["LLM 应用开发", "学术背景强", "技术博客质量高"], weaknesses: ["工程化经验待验证"], recommendation: "AI 方向首选" },
      notes: "HR 已联系，对方表示有兴趣了解团队。建议尽快安排技术面。", assignedTo: "admin@autocustomer.dev",
    },
    {
      githubId: "github004", username: "alex-kim-code", displayName: "Alex Kim",
      bio: "Mobile developer (React Native / Flutter). 5+ years building cross-platform apps. Open to new opportunities.",
      avatarUrl: "https://avatars.githubusercontent.com/u/4?v=4", location: "Austin, TX", company: null,
      blog: null, skillTags: "ReactNative,Flutter,Swift,Kotlin,TypeScript",
      techStack: "React Native,Flutter,TypeScript,Node.js,Firebase",
      languageStats: { TypeScript: 55, Dart: 25, Swift: 12, Kotlin: 8 },
      overallScore: 7.5, activityScore: 7.5, expertiseScore: 7.3, fitScore: 7.8,
      status: "CONTACTED", priority: "MEDIUM",
      profileAnalysis: { summary: "移动端全栈开发者，跨平台经验丰富", strengths: ["RN+Flutter 都会", "独立开发过上线 App"], weaknesses: ["后端深度不足"], recommendation: "移动端需求时考虑" },
      notes: "已发送初次外联邮件，等待回复。", assignedTo: "admin@autocustomer.dev",
    },
    {
      githubId: "github005", username: "liu-frontend", displayName: "Jason Liu",
      bio: "Frontend engineer focused on design systems and UX. Maintainer of several popular UI component libraries.",
      avatarUrl: "https://avatars.githubusercontent.com/u/5?v=4", location: "Toronto, Canada", company: null,
      blog: "https://jasonliu.design", skillTags: "Vue,React,CSS,DesignSystems,Figma",
      techStack: "Vue,React,TypeScript,Storybook,Figma",
      languageStats: { TypeScript: 60, Vue: 25, CSS: 10, JavaScript: 5 },
      overallScore: 8.0, activityScore: 8.8, expertiseScore: 7.8, fitScore: 7.5,
      status: "ANALYZED", priority: "MEDIUM",
      profileAnalysis: { summary: "前端体验专家，设计系统维护者", strengths: ["CSS/动画精通", "设计系统经验", "组件库维护"], weaknesses: ["无后端经验"], recommendation: "前端团队扩充候选" },
      notes: "AI 分析完成，评分优秀。待 HR 审批后进入联系阶段。", assignedTo: null,
    },
    {
      githubId: "github006", username: "rustacean-david", displayName: "David Park",
      bio: "Systems programmer. Rust enthusiast. Working on compiler tooling and developer experience tools.",
      avatarUrl: "https://avatars.githubusercontent.com/u/6?v=4", location: "Seoul, Korea", company: null,
      blog: "https://david-rust.dev", skillTags: "Rust,C++,WebAssembly,Compiler",
      techStack: "Rust,C++,Wasm,LLVM,Python",
      languageStats: { Rust: 70, C_plus_plus: 15, Python: 10, Haskell: 5 },
      overallScore: 8.3, activityScore: 7.0, expertiseScore: 9.0, fitScore: 7.8,
      status: "ANALYZING", priority: "LOW",
      profileAnalysis: null,
      notes: null, assignedTo: null,
    },
    {
      githubId: "github007", username: "devops-nina", displayName: "Nina Patel",
      bio: "DevOps/SRE. Terraform, Ansible, GitOps enthusiast. Making deployments boring (in a good way).",
      avatarUrl: "https://avatars.githubusercontent.com/u/7?v=4", location: "London, UK", company: null,
      blog: null, skillTags: "Terraform,Ansible,Docker,K8s,GitOps",
      techStack: "Terraform,Ansible,Docker,Kubernetes,Prometheus,Grafana",
      languageStats: { HCL: 40, Python: 30, Go: 20, Shell: 10 },
      overallScore: 7.8, activityScore: 7.2, expertiseScore: 8.0, fitScore: 7.5,
      status: "NEW", priority: "LOW",
      profileAnalysis: null,
      notes: null, assignedTo: null,
    },
    {
      githubId: "github008", username: "fullstack-luna", displayName: "Luna Martinez",
      bio: "Generalist who ships fast. Next.js, Supabase, Vercel stack. Building in public.",
      avatarUrl: "https://avatars.githubusercontent.com/u/8?v=4", location: "Madrid, Spain", company: null,
      blog: "https://lunacodes.com", skillTags: "Next.js,Supabase,Vercel,Stripe",
      techStack: "Next.js,Supabase,TypeScript,Prisma,tRPC",
      languageStats: { TypeScript: 75, SQL: 12, JavaScript: 8, HTML: 5 },
      overallScore: 7.2, activityScore: 9.0, expertiseScore: 6.8, fitScore: 6.5,
      status: "NEW", priority: "LOW",
      profileAnalysis: null,
      notes: null, assignedTo: null,
    },
    {
      githubId: "github009", username: "go-expert-kenji", displayName: "Kenji Tanaka",
      bio: "Senior Go backend engineer. Microservices architecture. 10y+ experience in fintech.",
      avatarUrl: "https://avatars.githubusercontent.com/u/9?v=4", location: "Tokyo, Japan", company: null,
      blog: null, skillTags: "Go,Microservices,gRPC,EventDriven",
      techStack: "Go,Java,Kafka,Redis,PostgreSQL,Elasticsearch",
      languageStats: { Go: 60, Java: 25, Shell: 10, YAML: 5 },
      overallScore: 8.5, activityScore: 6.5, expertiseScore: 9.2, fitScore: 8.0,
      status: "REPLIED", priority: "HIGH",
      profileAnalysis: { summary: "资深 Go 后端工程师，金融科技背景", strengths: ["高并发经验", "微服务架构", "领域驱动设计"], weaknesses: ["英语沟通需确认"], recommendation: "后端核心岗位强力推荐" },
      notes: "已回复邮件，表达了对远程工作的兴趣。安排二面。", assignedTo: "admin@autocustomer.dev",
    },
    {
      githubId: "github010", username: "ml-rookie-sam", displayName: "Sam Johnson",
      bio: "Aspiring ML engineer. Just finished Master's in CS. Eager to learn and contribute!",
      avatarUrl: "https://avatars.githubusercontent.com/u/10?v=4", location: "Melbourne, Australia", company: null,
      blog: null, skillTags: "Python,Scikit-learn,Pandas,SQL",
      techStack: "Python,Pandas,Scikit-learn,PostgreSQL,Flask",
      languageStats: { Python: 70, SQL: 20, JavaScript: 7, HTML: 3 },
      overallScore: 5.5, activityScore: 6.0, expertiseScore: 5.0, fitScore: 5.5,
      status: "DISQUALIFIED", priority: "LOW",
      profileAnalysis: { summary: "初级开发者，经验尚浅", strengths: ["学习热情高", "基础扎实"], weaknesses: ["缺乏实战项目", "无开源贡献"], recommendation: "暂时不考虑" },
      notes: "经验不够匹配当前岗位要求。6个月后可重新评估。", assignedTo: null,
    },
  ];

  const created = [];
  for (const dev of developers) {
    const createData: any = { ...dev, lastSyncAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) };
    if (dev.profileAnalysis === null) delete createData.profileAnalysis;
    const d = await db.developers.upsert({
      where: { username: dev.username },
      update: createData,
      create: createData,
    });
    created.push(d);
  }
  console.log(`   ✅ ${created.length} developers created`);

  // 为每个开发者创建 GitHub 项目
  console.log("   📦 Creating developer projects...");
  const projectData = [
    { username: "sarahchen-dev", name: "react-query-devtools", desc: "DevTools extension for React Query v5", url: "https://github.com/sarahchen-dev/react-query-devtools", stars: 2800, lang: "TypeScript", topics: "react-query,devtools,react", primary_language: "TypeScript" },
    { username: "sarahchen-dev", name: "tanstack-table-playground", desc: "Interactive playground for TanStack Table v8", url: "https://github.com/sarahchen-dev/tanstack-table-playground", stars: 450, lang: "TypeScript", topics: "table,playground,typescript", primary_language: "TypeScript" },
    { username: "mike-zhang", name: "k8s-operator-sdk", desc: "Lightweight Kubernetes operator SDK in Go", url: "https://github.com/mike-zhang/k8s-operator-sdk", stars: 1200, lang: "Go", topics: "kubernetes,operator,golang,k8s", primary_language: "Go" },
    { username: "mike-zhang", name: "distributed-timer", desc: "Distributed cron service with high availability", url: "https://github.com/mike-zhang/distributed-timer", stars: 340, lang: "Go", topics: "distributed,cron,go", primary_language: "Go" },
    { username: "emma-wang-oss", name: "rag-pipeline-kit", desc: "Production-ready RAG pipeline framework", url: "https://github.com/emma-wang-oss/rag-pipeline-kit", stars: 1900, lang: "Python", topics: "llm,rag,ai,lamaindex", primary_language: "Python" },
    { username: "emma-wang-oss", name: "llm-eval-benchmark", desc: "Benchmark suite for LLM evaluation", url: "https://github.com/emma-wang-oss/llm-eval-benchmark", stars: 890, lang: "Python", topics: "llm,evaluation,benchmark", primary_language: "Python" },
    { username: "alex-kim-code", name: "rn-animations", desc: "50+ React Native animation components", url: "https://github.com/alex-kim-code/rn-animations", stars: 2100, lang: "TypeScript", topics: "react-native,animation,mobile", primary_language: "TypeScript" },
    { username: "liu-frontend", name: "vue-design-system", desc: "Enterprise Vue 3 design system", url: "https://github.com/liu-frontend/vue-design-system", stars: 1600, lang: "Vue", topics: "vue,design-system,ui", primary_language: "Vue" },
    { username: "rustacean-david", name: "wasm-compiler-tools", desc: "WebAssembly compiler utility toolkit", url: "https://github.com/rustacean-david/wasm-compiler-tools", stars: 560, lang: "Rust", topics: "rust,wasm,compiler", primary_language: "Rust" },
    { username: "fullstack-luna", name: "nextjs-saas-template", desc: "Production SaaS template with auth + payments", url: "https://github.com/fullstack-luna/nextjs-saas-template", stars: 3200, lang: "TypeScript", topics: "nextjs,supabase,saas", primary_language: "TypeScript" },
    { username: "go-expert-kenji", name: "microservice-framework", desc: "Opinionated microservice framework in Go", url: "https://github.com/go-expert-kenji/microservice-framework", stars: 1800, lang: "Go", topics: "go,microservices,framework", primary_language: "Go" },
  ];

  let projectCount = 0;
  for (const p of projectData) {
    const dev = created.find((d) => d.username === p.username);
    if (dev) {
      await db.developer_projects.upsert({
        where: { id: `${dev.id}-${p.name}` },
        update: {},
        create: {
          id: `${dev.id}-${p.name}`,
          developer_id: dev.id,
          name: p.name,
          description: p.desc,
          url: p.url,
          stars: p.stars,
          language: p.lang,
          topics: p.topics,
          is_fork: false,
          primary_language: p.primary_language,
          updated_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });
      projectCount++;
    }
  }
  console.log(`   ✅ ${projectCount} projects created`);

  return created;
}

// ============================================================
// 3. Leads (客户线索)
// ============================================================
async function seedLeads() {
  console.log("\n🎯 Creating leads...");

  const leads = [
    { id: crypto.randomUUID(), source_type: "GITHUB", companyName: "ByteFlow Tech", contactName: "张伟", contactEmail: "zhangwei@byteflow.io", contactPhone: "+86 138 0001 1001", contactTitle: "CTO", website: "https://byteflow.io", industry: "SaaS / 开发者工具", companySize: "STARTUP_1_10", aiCategory: "DATA_ANALYTICS", stage: "NEGOTIATING", warmScore: 85, painPoints: "需要自动化客户获取流程，目前手动操作效率低", potentialValue: 50000, tags: "SaaS,高意向,B2B", nextFollowUpAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), updatedAt: new Date() },
    { id: crypto.randomUUID(), source_type: "LINKEDIN", companyName: "CloudScale Solutions", contactName: "李娜", contactEmail: "lina@cloudscale.ai", contactTitle: "VP Engineering", website: "https://cloudscale.ai", industry: "云计算 / 基础设施", companySize: "SMB_11_50", aiCategory: "ECOMMERCE_MONITORING", stage: "TRIAL_STARTED", warmScore: 72, painPoints: "监控多个云服务商成本困难", potentialValue: 80000, tags: "云计算,试用中", nextFollowUpAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), linkedinUrl: "https://linkedin.com/in/lina-cloudscale", updatedAt: new Date() },
    { id: crypto.randomUUID(), source_type: "INDUSTRY_DIRECTORY", companyName: "DataPulse Analytics", contactName: "王磊", contactEmail: "wanglei@datapulse.cn", contactTitle: "产品总监", website: "https://datapulse.cn", industry: "数据智能 / BI", companySize: "MID_51_200", aiCategory: "MARKET_RESEARCH", stage: "CONTACTED", warmScore: 58, painPoints: "市场数据分析依赖人工，周期长", potentialValue: 120000, tags: "BI,数据智能,中期", nextFollowUpAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), updatedAt: new Date() },
    { id: crypto.randomUUID(), source_type: "SOCIAL_MEDIA", companyName: "SmartRetail Co", contactName: "陈思", contactEmail: "chensi@smartretail.com", contactTitle: "运营负责人", website: "https://smartretail.com", industry: "零售科技", companySize: "LARGE_201_1000", aiCategory: "SOCIAL_MARKETING", stage: "QUALIFIED", warmScore: 65, painPoints: "社交媒体投放效果难以量化", potentialValue: 200000, tags: "零售,社媒营销,大客户", nextFollowUpAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), updatedAt: new Date() },
    { id: crypto.randomUUID(), source_type: "FORUM", companyName: "OpenSourceHub", contactName: "赵明", contactEmail: "zhaoming@opensourcehub.dev", contactTitle: "社区经理", website: "https://opensourcehub.dev", industry: "开发者社区", companySize: "STARTUP_1_10", aiCategory: "SALES_INTELLIGENCE", stage: "NEW", warmScore: 30, painPoints: "社区增长遇到瓶颈，需要新策略", potentialValue: 25000, tags: "开源社区,早期", nextFollowUpAt: null, updatedAt: new Date() },
    { id: crypto.randomUUID(), source_type: "JOB_POSTING", companyName: "FinTech Global", contactName: "刘洋", contactEmail: "liuyang@fintechglobal.com", contactTitle: "Head of Growth", website: "https://fintechglobal.com", industry: "金融科技", companySize: "ENTERPRISE_1000_PLUS", aiCategory: "OTHER", stage: "MEETING_SCHEDULED", warmScore: 78, painPoints: "全球合规获客流程复杂", potentialValue: 500000, tags: "金融,企业级,高价值", nextFollowUpAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), updatedAt: new Date() },
    { id: crypto.randomUUID(), source_type: "WEB_SCRAPER", companyName: "EduTech Pro", contactName: "孙婷", contactEmail: "sunting@edutech.pro", contactTitle: "CMO", website: "https://edutech.pro", industry: "教育科技", companySize: "SMB_11_50", aiCategory: "ECOMMERCE_MONITORING", stage: "CONTACTED", warmScore: 45, painPoints: "线上课程推广渠道单一", potentialValue: 35000, tags: "教育,营销", nextFollowUpAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), updatedAt: new Date() },
    { id: crypto.randomUUID(), source_type: "API_FEED", companyName: "HealthTech AI", contactName: "周凯", contactEmail: "zhoukai@healthtech.ai", contactTitle: "CEO & Founder", website: "https://healthtech.ai", industry: "医疗 AI", companySize: "STARTUP_1_10", aiCategory: "DATA_ANALYTICS", stage: "NEW", warmScore: 25, painPoints: "医疗数据采集和结构化处理", potentialValue: 150000, tags: "AI医疗,早期,高潜力", nextFollowUpAt: null, updatedAt: new Date() },
    { id: crypto.randomUUID(), source_type: "MANUAL_IMPORT", companyName: "LogisticsFlow", contactName: "吴芳", contactEmail: "wufang@logisticsflow.io", contactTitle: "供应链总监", website: null, industry: "物流科技", companySize: "MID_51_200", aiCategory: "OTHER", stage: "LOST", warmScore: 20, painPoints: null, potentialValue: 60000, tags: "物流,已流失", nextFollowUpAt: null, updatedAt: new Date() },
    { id: crypto.randomUUID(), source_type: "GITHUB", companyName: "GreenCode Labs", contactName: "郑浩", contactEmail: "zhenghao@greencode.dev", contactTitle: "Tech Lead", website: "https://greencode.dev", industry: "绿色科技 / 碳追踪", companySize: "SMB_11_50", aiCategory: "DATA_ANALYTICS", stage: "WON", warmScore: 95, painPoints: "碳排放数据处理自动化需求强烈", potentialValue: 90000, tags: "ESG,已成交,标杆客户", nextFollowUpAt: null, updatedAt: new Date() },
    { id: crypto.randomUUID(), source_type: "LINKEDIN", companyName: "GameVerse Studio", contactName: "黄欣", contactEmail: "huangxin@gameverse.gg", contactTitle: "制作人", website: "https://gameverse.gg", industry: "游戏开发", companySize: "STARTUP_1_10", aiCategory: "SOCIAL_MARKETING", stage: "CHURNED", warmScore: 15, painPoints: null, potentialValue: 40000, tags: "游戏,已流失", nextFollowUpAt: null, updatedAt: new Date() },
    { id: crypto.randomUUID(), source_type: "SOCIAL_MEDIA", companyName: "AgriTech Smart", contactName: "林涛", contactEmail: "lintao@agritech.smart", contactTitle: "数字化负责人", website: null, industry: "农业科技", companySize: "LARGE_201_1000", aiCategory: "MARKET_RESEARCH", stage: "QUALIFIED", warmScore: 55, painPoints: "农产品市场价格信息分散", potentialValue: 180000, tags: "农业,大客户,潜力", nextFollowUpAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), updatedAt: new Date() },
    { id: crypto.randomUUID(), source_type: "GITHUB", companyName: "QuantEdge Trading", contactName: "马超", contactEmail: "machao@quantedge.trade", contactTitle: "CTO", website: "https://quantedge.trade", industry: "量化交易", companySize: "STARTUP_1_10", aiCategory: "SALES_INTELLIGENCE", stage: "NEGOTIATING", warmScore: 88, painPoints: "交易信号分析和自动执行系统", potentialValue: 300000, tags: "金融科技,高意向,大单", nextFollowUpAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), updatedAt: new Date() },
  ];

  const created = [];
  for (const lead of leads) {
    const l = await db.leads.create({ data: lead });
    created.push(l);
  }
  console.log(`   ✅ ${created.length} leads created`);
  return created;
}

// ============================================================
// 4. Campaigns (营销活动)
// ============================================================
async function seedCampaigns(user: { id: string }) {
  console.log("\n📢 Creating campaigns...");

  const campaigns = [
    {
      id: crypto.randomUUID(),
      name: "Q1 开发者招募计划",
      description: "针对 React/Go/Rust 技术栈的开源贡献者定向招募活动",
      type: "DEVELOPER_RECRUIT",
      config: { keywords: ["react", "go", "rust", "open source"], locations: ["Remote", "US", "Canada"] },
      target_count: 50,
      status: "RUNNING",
      scheduled_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      started_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      total_sent: 32, total_replied: 12, total_converted: 2,
      creator_id: user.id,
      updatedAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      name: "SaaS 企业客户拓展 — 华东区",
      description: "面向华东地区 SaaS 企业的冷启动外联活动",
      type: "CUSTOMER_GROWTH",
      config: { industries: ["SaaS", "Cloud", "Developer Tools"], regions: ["Shanghai", "Hangzhou", "Nanjing"], channels: ["EMAIL", "LINKEDIN_DM"] },
      target_count: 100,
      status: "RUNNING",
      scheduled_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      started_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      total_sent: 67, total_replied: 23, total_converted: 5,
      creator_id: user.id,
      updatedAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      name: "AI 工具早期用户计划",
      description: "面向 AI/ML 团队的种子用户邀请活动",
      type: "CUSTOMER_GROWTH",
      config: { targetPersona: "AI Engineer / ML Researcher", channels: ["EMAIL", "TWITTER_DM"] },
      target_count: 30,
      status: "COMPLETED",
      scheduled_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      started_at: new Date(Date.now() - 44 * 24 * 60 * 60 * 1000),
      completed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      total_sent: 28, total_replied: 18, total_converted: 9,
      creator_id: user.id,
      updatedAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      name: "Rust 社区 KOL 联合推广",
      description: "与 Rust 中文社区合作的技术内容联合推广",
      type: "DEVELOPER_RECRUIT",
      config: { partners: ["Rust China", "RustCC"], contentType: "tech-blog,webinar" },
      target_count: 20,
      status: "DRAFT",
      total_sent: 0, total_replied: 0, total_converted: 0,
      creator_id: user.id,
      updatedAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      name: "Q2 客户成功案例征集",
      description: "针对已有成交客户的案例素材收集和转介绍活动",
      type: "CUSTOMER_GROWTH",
      config: { targetStage: "WON", incentive: "免费升级 3 个月" },
      target_count: 15,
      status: "PAUSED",
      scheduled_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      started_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      total_sent: 8, total_replied: 3, total_converted: 1,
      creator_id: user.id,
      updatedAt: new Date(),
    },
  ];

  const created = [];
  for (const c of campaigns) {
    const campaign = await db.campaigns.create({ data: c });
    created.push(campaign);
  }
  console.log(`   ✅ ${created.length} campaigns created`);

  // 创建 Campaign-Lead 关联
  console.log("   🔗 Linking campaigns to leads...");
  const allLeads = await db.leads.findMany({ take: 10 });
  let linkCount = 0;

  // Running campaign 1 -> leads 0-3
  for (let i = 0; i < Math.min(4, allLeads.length); i++) {
    try { await db.campaign_leads.create({ data: { id: `${created[0].id}-${allLeads[i].id}`, campaign_id: created[0].id, lead_id: allLeads[i].id } }); linkCount++; } catch {}
  }
  // Running campaign 2 -> leads 3-7
  for (let i = 3; i < Math.min(8, allLeads.length); i++) {
    try { await db.campaign_leads.create({ data: { id: `${created[1].id}-${allLeads[i].id}`, campaign_id: created[1].id, lead_id: allLeads[i].id } }); linkCount++; } catch {}
  }
  // Completed campaign 3 -> leads 7-10
  for (let i = 7; i < Math.min(11, allLeads.length); i++) {
    try { await db.campaign_leads.create({ data: { id: `${created[2].id}-${allLeads[i].id}`, campaign_id: created[2].id, lead_id: allLeads[i].id } }); linkCount++; } catch {}
  }

  console.log(`   ✅ ${linkCount} campaign-lead links created`);
  return created;
}

// ============================================================
// 5. Outreach Logs (外联记录)
// ============================================================
async function seedOutreach(campaigns: Array<{ id: string; name: string }>) {
  console.log("\n✉️ Creating outreach logs...");

  const allDevs = await db.developers.findMany({ take: 6 });
  const allLeads = await db.leads.findMany({ take: 8 });

  const outreachData = [
    // Developer emails
    { id: crypto.randomUUID(), target_type: "DEVELOPER", target_id: allDevs[0]?.id, channel: "EMAIL", subject: "Hi Sarah — loved your work on React Query DevTools 👋", body: "Hey Sarah,\n\nI've been following your contributions to React Query and the TanStack ecosystem — the DevTools extension is incredibly polished.\n\nWe're building an AI-powered developer platform and I think your expertise in React tooling would be a perfect fit. Would you be open to a quick chat?\n\nBest,\nKingston from AutoCustomer", ai_generated: true, ai_model_used: "deepseek-chat", status: "REPLIED", sent_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), delivered_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 120000), opened_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 3600000), replied_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), campaign_id: campaigns[0]?.id, updatedAt: new Date() },
    { id: crypto.randomUUID(), target_type: "DEVELOPER", target_id: allDevs[1]?.id, channel: "EMAIL", subject: "Mike — distributed systems + Go = our kind of person 🚀", body: "Hi Mike,\nYour work on k8s-operator-sdk caught my eye — exactly the kind of production-grade tooling we need.\nWe're scaling our infra team and your background in distributed systems is spot on.\nOpen to a conversation?\n— Kingston", ai_generated: true, ai_model_used: "deepseek-chat", status: "REPLIED", sent_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), delivered_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 60000), opened_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 7200000), replied_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), campaign_id: campaigns[0]?.id, updatedAt: new Date() },
    { id: crypto.randomUUID(), target_type: "DEVELOPER", target_id: allDevs[2]?.id, channel: "EMAIL", subject: "Emma — your RAG pipeline kit is impressive 🧠", body: "Hi Emma,\nJust went through your RAG pipeline kit repo — the way you handle document chunking and embedding strategies is really thoughtful.\nWe're working on some interesting LLM applications and I'd love to pick your brain.\nInterested?\nKingston", ai_generated: true, ai_model_used: "gpt-4o", status: "OPENED", sent_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), delivered_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30000), opened_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 14400000), campaign_id: campaigns[0]?.id, updatedAt: new Date() },
    { id: crypto.randomUUID(), target_type: "DEVELOPER", target_id: allDevs[3]?.id, channel: "EMAIL", subject: "Alex — RN animations library looks great 📱", body: "Hey Alex,\nYour rn-animations collection is awesome! We're actually looking for someone with your exact skillset.\nWould love to connect.\n— Kingston @ AutoCustomer", ai_generated: true, ai_model_used: "deepseek-chat", status: "SENT", sent_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), delivered_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 45000), campaign_id: campaigns[0]?.id, updatedAt: new Date() },
    // Lead emails
    { id: crypto.randomUUID(), target_type: "LEAD", target_id: allLeads[0]?.id, channel: "EMAIL", subject: "ByteFlow Tech — 自动化获客方案", body: "张总您好，\n\n关注到 ByteFlow 正在寻找自动化客户获取解决方案。我们 AutoCustomer 平台可以帮您：\n• GitHub 开发者自动采集与筛选\n• AI 驱动的智能分析\n• 多渠道外联触达\n\n方便本周安排一个 15 分钟的 demo 吗？\n\nKingston | AutoCustomer", ai_generated: true, ai_model_used: "deepseek-chat", status: "REPLIED", sent_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), delivered_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 60000), opened_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 3600000), replied_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), campaign_id: campaigns[1]?.id, updatedAt: new Date() },
    { id: crypto.randomUUID(), target_type: "LEAD", target_id: allLeads[1]?.id, channel: "EMAIL", subject: "CloudScale — 云成本监控方案", body: "李娜您好，\n\n了解到 CloudScale 在多云管理方面的挑战。我们的 AI 分析平台可以帮您...\n（省略详细方案）\n期待您的回复！", ai_generated: true, ai_model_used: "deepseek-chat", status: "DELIVERED", sent_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), delivered_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30000), opened_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 10800000), campaign_id: campaigns[1]?.id, updatedAt: new Date() },
    { id: crypto.randomUUID(), target_type: "LEAD", target_id: allLeads[2]?.id, channel: "EMAIL", subject: "DataPulse — 市场数据分析自动化", body: "王磊总您好，\n\n关于 DataPulse 在市场数据分析效率方面的问题，我们有成熟的解决方案...", ai_generated: true, ai_model_used: "gpt-4o", status: "SENT", sent_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), delivered_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 20000), campaign_id: campaigns[1]?.id, updatedAt: new Date() },
    { id: crypto.randomUUID(), target_type: "LEAD", target_id: allLeads[5]?.id, channel: "LINKEDIN_DM", subject: "", body: "Hi 刘洋，关注到 FinTech Global 在全球合规获客方面的创新。我们有一套 AI 驱动的解决方案可能很适合您的场景。方便聊聊吗？", ai_generated: false, status: "REPLIED", sent_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), delivered_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), opened_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 7200000), replied_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), campaign_id: campaigns[1]?.id, updatedAt: new Date() },
    // Failed email
    { id: crypto.randomUUID(), target_type: "LEAD", target_id: allLeads[8]?.id, channel: "EMAIL", subject: "LogisticsFlow — 供应链数字化方案", body: "吴芳您好...", ai_generated: true, ai_model_used: "deepseek-chat", status: "BOUNCED", error: "550 5.1.1 Recipient address rejected: wufang@logisticsflow.io", sent_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), bounced_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 5000), updatedAt: new Date() },
  ];

  let count = 0;
  for (const o of outreachData) {
    if (o.target_id) {
      await db.outreach_logs.create({ data: o });
      count++;
    }
  }
  console.log(`   ✅ ${count} outreach logs created`);
}

// ============================================================
// 6. Workflows (工作流)
// ============================================================
async function seedWorkflows(campaigns: Array<{ id: string }>) {
  console.log("\n⚡ Creating workflows...");

  const workflows = [
    {
      id: crypto.randomUUID(),
      name: "每日 GitHub 开发者采集 + AI 分析",
      description: "每天凌晨 2 点自动搜索 GitHub Trending 和特定关键词开发者，然后批量进行 AI 能力评估分析",
      type: "DEVELOPER_RECRUIT",
      definition: {
        trigger: { type: "schedule", cron: "0 2 * * *" },
        steps: [
          { id: "step-1", type: "github-scrape", config: { keywords: ["react", "typeScript", "open source"], minStars: 50, language: "any" }, name: "GitHub 开发者搜索" },
          { id: "step-2", type: "ai-analyze", config: { model: "deepseek-chat", promptTemplate: "developer-analysis" }, name: "AI 能力评估" },
          { id: "step-3", type: "classify", config: { criteria: "overall_score >= 8.0 ? HIGH : overall_score >= 6.0 ? MEDIUM : LOW" }, name: "优先级分类" },
          { id: "step-4", type: "delay", config: { duration: "0" }, name: "结束" },
        ],
      },
      is_active: true,
      updatedAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      name: "新线索自动跟进序列",
      description: "当有 NEW 状态的新线索进入系统时，自动触发 3 封渐进式外联邮件",
      type: "CUSTOMER_GROWTH",
      definition: {
        trigger: { type: "event", event: "lead.created", filters: { stage: "NEW" } },
        steps: [
          { id: "step-1", type: "delay", config: { duration: "1h" }, name: "等待 1 小时" },
          { id: "step-2", type: "generate-outreach", config: { channel: "EMAIL", template: "cold-outreach", aiGenerate: true }, name: "生成首封外联邮件" },
          { id: "step-3", type: "send-email", config: {}, name: "发送邮件" },
          { id: "step-4", type: "delay", config: { duration: "3d" }, name: "等待 3 天" },
          { id: "step-5", type: "condition", config: { condition: "replied == true", ifTrue: "end", ifFalse: "step-6" }, name: "检查是否回复" },
          { id: "step-6", type: "generate-followup", config: { template: "follow-up-1" }, name: "生成跟进邮件" },
        ],
      },
      is_active: true,
      updatedAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      name: "每周销售报告生成",
      description: "每周五下午 4 点自动汇总本周线索变化、外联效果、转化数据，生成周报并通知团队",
      type: "CUSTOMER_GROWTH",
      definition: {
        trigger: { type: "schedule", cron: "0 16 * * 5" },
        steps: [
          { id: "step-1", type: "aggregate-stats", config: { period: "week" }, name: "聚合统计数据" },
          { id: "step-2", type: "ai-report", config: { model: "deepseek-chat", sections: ["summary", "funnel", "top_performers", "blockers"] }, name: "AI 生成周报" },
          { id: "step-3", type: "send-notification", config: { channel: "IN_APP", recipients: ["team"] }, name: "通知团队" },
        ],
      },
      is_active: false,
      updatedAt: new Date(),
    },
  ];

  const created = [];
  for (const wf of workflows) {
    const workflow = await db.workflow_definitions.create({ data: wf });
    // 为每个 workflow 创建一些运行记录
    const runStatuses = ["COMPLETED", "COMPLETED", "RUNNING", "FAILED", "PENDING"];
    for (let i = 0; i < 3; i++) {
      const status = runStatuses[i % runStatuses.length];
      const runData: any = {
        id: crypto.randomUUID(),
        workflow_id: workflow.id,
        campaign_id: campaigns[i % campaigns.length]?.id,
        status,
        current_step: status === "COMPLETED" ? null : `step-${Math.min(i + 1, 3)}`,
        started_at: new Date(Date.now() - (i + 1) * 2 * 24 * 60 * 60 * 1000),
        logs: JSON.stringify([`Step 1 completed at ${new Date(Date.now() - i * 2 * 24 * 60 * 60 * 1000).toISOString()}`, `Step 2 started...`]),
      };
      if (status === "COMPLETED") {
        runData.completed_at = new Date(Date.now() - i * 2 * 24 * 60 * 60 * 1000 + 3600000);
        runData.result = JSON.stringify({ processed: 12 + i * 5, success: 10 + i * 3, failed: 2 });
      }
      if (status === "FAILED") {
        runData.completed_at = new Date(Date.now() - i * 2 * 24 * 60 * 60 * 1000 + 600000);
        runData.error_msg = "API rate limit exceeded during AI analysis step";
      }
      await db.workflow_runs.create({ data: runData });
    }
    created.push(workflow);
  }
  console.log(`   ✅ ${created.length} workflows created (with 3 runs each)`);

  return created;
}

// ============================================================
// 7. Interactions (互动记录)
// ============================================================
async function seedInteractions(developers: Array<{ id: string }>, leads: Array<{ id: string }>) {
  console.log("\n💬 Creating interactions...");

  const interactions = [
    // Developer interactions
    { id: crypto.randomUUID(), target_type: "DEVELOPER", target_id: developers[0]?.id, type: "EMAIL", direction: "OUTGOING", content: "发送初始外联邮件 — React Query DevTools 项目", summary: "首次接触", sentiment: "NEUTRAL" },
    { id: crypto.randomUUID(), target_type: "DEVELOPER", target_id: developers[0]?.id, type: "REPLY", direction: "INCOMING", content: "Hi Kingston, thanks for reaching out! I'm definitely interested in learning more.", summary: "积极回复，表示感兴趣", sentiment: "POSITIVE" },
    { id: crypto.randomUUID(), target_type: "DEVELOPER", target_id: developers[0]?.id, type: "FOLLOW_UP", direction: "OUTGOING", content: "发送技术面试安排邮件", summary: "安排面试", sentiment: "NEUTRAL" },
    { id: crypto.randomUUID(), target_type: "DEVELOPER", target_id: developers[1]?.id, type: "EMAIL", direction: "OUTGOING", content: "发送 K8s 相关外联邮件", summary: "首次接触", sentiment: "NEUTRAL" },
    { id: crypto.randomUUID(), target_type: "DEVELOPER", target_id: developers[1]?.id, type: "REPLY", direction: "INCOMING", content: "Interesting! Can you share more about the tech stack?", summary: "询问技术细节", sentiment: "POSITIVE" },
    { id: crypto.randomUUID(), target_type: "DEVELOPER", target_id: developers[3]?.id, type: "EMAIL", direction: "OUTGOING", content: "发送 RN 动画库相关外联", summary: "首次接触", sentiment: "NEUTRAL" },
    // Lead interactions
    { id: crypto.randomUUID(), target_type: "LEAD", target_id: leads[0]?.id, type: "MEETING", direction: "INCOMING", content: "完成产品 demo 会议，对方对自动化功能印象深刻", summary: "Demo 会议完成", sentiment: "POSITIVE" },
    { id: crypto.randomUUID(), target_type: "LEAD", target_id: leads[0]?.id, type: "EMAIL", direction: "OUTGOING", content: "发送报价单和合同草案", summary: "进入商务谈判", sentiment: "NEUTRAL" },
    { id: crypto.randomUUID(), target_type: "LEAD", target_id: leads[1]?.id, type: "CALL", direction: "INCOMING", content: "电话沟通试用反馈，整体满意但希望增加自定义功能", summary: "试用反馈电话", sentiment: "POSITIVE" },
    { id: crypto.randomUUID(), target_type: "LEAD", target_id: leads[5]?.id, type: "MEETING", direction: "INCOMING", content: "与 Head of Growth 进行初步会议，了解全球合规需求", summary: "需求探索会议", sentiment: "POSITIVE" },
    { id: crypto.randomUUID(), target_type: "LEAD", target_id: leads[8]?.id, type: "STATUS_CHANGE", direction: "OUTGOING", content: "标记为 LOST — 邮件地址无效，无法联系", summary: "流失", sentiment: "NEGATIVE" },
    { id: crypto.randomUUID(), target_type: "LEAD", target_id: leads[9]?.id, type: "NOTE", direction: "OUTGOING", content: "成交！签约年度合同 ¥90,000。作为 ESG 行业标杆案例跟进", summary: "成交记录", sentiment: "POSITIVE" },
  ];

  let count = 0;
  for (const ix of interactions) {
    if (ix.target_id) {
      await db.interactions.create({ data: ix });
      count++;
    }
  }
  console.log(`   ✅ ${count} interactions created`);
}

// ============================================================
// 8. AI Model Config
// ============================================================
async function seedAiConfigs() {
  console.log("\n🤖 Setting up AI model configs...");

  const configs = [
    { id: "config-deepseek-chat", name: "DeepSeek Chat", provider: "DEEPSEEK", model_name: "deepseek-chat", api_key_encrypted: "sk-demo-key-replace", capabilities: "chat,analysis,outreach-generation,follow-up", default_for: "default", maxTokens: 8192, temperature: 0.7, cost_per_1k_tokens: 0.0014, is_active: true, updatedAt: new Date() },
    { id: "config-gpt-4o", name: "GPT-4o", provider: "OPENAI", model_name: "gpt-4o", api_key_encrypted: "sk-demo-key-replace", capabilities: "chat,analysis,code-generation", default_for: null, maxTokens: 128000, temperature: 0.7, cost_per_1k_tokens: 0.005, is_active: true, updatedAt: new Date() },
    { id: "config-qwen-max", name: "通义千问 Max", provider: "QWEN", model_name: "qwen-max", api_key_encrypted: "sk-demo-key-replace", capabilities: "chat,chinese-analysis", default_for: null, maxTokens: 8192, temperature: 0.85, cost_per_1k_tokens: 0.0008, is_active: false, updatedAt: new Date() },
  ];

  for (const cfg of configs) {
    await db.ai_model_configs.upsert({
      where: { id: cfg.id },
      update: cfg,
      create: cfg,
    });
  }
  console.log(`   ✅ ${configs.length} AI model configs created`);
}

// ============================================================
// 9. Task Queue (任务队列示例)
// ============================================================
async function seedTasks() {
  console.log("\n📋 Creating tasks...");

  const taskTypes: any[] = [
    { id: crypto.randomUUID(), type: "SYNC_GITHUB_TRENDING", status: "COMPLETED", payload: { language: "TypeScript", since: "daily" }, result: { found: 15, imported: 12 }, priority: 5, completed_at: new Date(Date.now() - 2 * 60 * 60 * 1000), updated_at: new Date() },
    { id: crypto.randomUUID(), type: "ANALYZE_DEVELOPER", status: "PROCESSING", payload: { developerId: "seed-dev-006" }, priority: 3 },
    { id: crypto.randomUUID(), type: "SEND_EMAIL_BATCH", status: "PENDING", payload: { campaignId: "seed-campaign-1", batchSize: 10 }, priority: 5, scheduled_at: new Date(Date.now() + 30 * 60 * 1000) },
    { id: crypto.randomUUID(), type: "GENERATE_COLD_OUTREACH", status: "COMPLETED", payload: { leadId: "seed-lead-00", template: "cold-outreach" }, result: { generated: true, model: "deepseek-chat" }, priority: 4, completed_at: new Date(Date.now() - 30 * 60 * 1000), updated_at: new Date() },
    { id: crypto.randomUUID(), type: "GENERATE_REPORT", status: "FAILED", payload: { period: "week", format: "pdf" }, error_msg: "PDF generation service timeout", priority: 2, retry_count: 2 },
    { id: crypto.randomUUID(), type: "SCRAPE_LEAD_SOURCE", status: "PENDING", payload: { source: "crunchbase", query: "AI SaaS China" }, priority: 3, scheduled_at: new Date(Date.now() + 2 * 60 * 60 * 1000) },
  ];

  let count = 0;
  for (const t of taskTypes) {
    await db.task_queue.create({ data: t });
    count++;
  }
  console.log(`   ✅ ${count} tasks created`);
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🌱 AutoCustomer Seed Data Generator");
  console.log("=".repeat(60));

  try {
    // 1. User
    const user = await seedUser();

    // 2. Developers + Projects
    const developers = await seedDevelopers();

    // 3. Leads
    const leads = await seedLeads();

    // 4. Campaigns + CampaignLead links
    const campaigns = await seedCampaigns(user);

    // 5. Outreach Logs
    await seedOutreach(campaigns);

    // 6. Workflows + WorkflowRuns
    await seedWorkflows(campaigns);

    // 7. Interactions
    await seedInteractions(developers, leads);

    // 8. AI Model Configs
    await seedAiConfigs();

    // 9. Tasks
    await seedTasks();

    console.log("\n" + "=".repeat(60));
    console.log("🎉 Seed complete! Summary:");
    console.log("   • 1 Admin user");
    console.log("   • 10 Developers (+ 11 projects)");
    console.log("   • 13 Leads (各种状态/来源)");
    console.log("   • 5 Campaigns (Running/Completed/Draft/Paused)");
    console.log("   • 9 Outreach logs (replied/sent/bounced/delivered)");
    console.log("   • 3 Workflow definitions (+ 9 runs)");
    console.log("   • 12 Interactions");
    console.log("   • 3 AI model configs");
    console.log("   • 6 Task queue items");
    console.log("=".repeat(60));
    console.log("\n🚀 Run 'npm run dev' and open http://localhost:3000\n");

  } catch (error) {
    console.error("\n❌ Seed failed:");
    console.error(error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
