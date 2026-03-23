-- Seed 100 common IT skills into skill_mappings table
-- Each skill has: category, synonyms (alternative names), related_skills (semantically related)
-- Uses ON CONFLICT to be idempotent (safe to re-run)

INSERT INTO skill_mappings (skill_name, category, synonyms, related_skills) VALUES

-- ===== FRONTEND (15 skills) =====
('React', 'frontend', ARRAY['ReactJS', 'React.js', 'React JS'], ARRAY['frontend', 'JavaScript', 'Redux', 'Next.js']),
('Angular', 'frontend', ARRAY['AngularJS', 'Angular.js', 'Angular 2+'], ARRAY['frontend', 'TypeScript', 'RxJS']),
('Vue.js', 'frontend', ARRAY['Vue', 'VueJS', 'Vue 3'], ARRAY['frontend', 'JavaScript', 'Nuxt.js']),
('Next.js', 'frontend', ARRAY['NextJS', 'Next'], ARRAY['frontend', 'React', 'SSR', 'TypeScript']),
('Nuxt.js', 'frontend', ARRAY['NuxtJS', 'Nuxt'], ARRAY['frontend', 'Vue.js', 'SSR']),
('HTML', 'frontend', ARRAY['HTML5', 'HyperText Markup Language'], ARRAY['frontend', 'CSS', 'JavaScript']),
('CSS', 'frontend', ARRAY['CSS3', 'Cascading Style Sheets'], ARRAY['frontend', 'HTML', 'SASS', 'LESS']),
('SASS', 'frontend', ARRAY['SCSS', 'Syntactically Awesome Stylesheets'], ARRAY['frontend', 'CSS']),
('Tailwind CSS', 'frontend', ARRAY['TailwindCSS', 'Tailwind'], ARRAY['frontend', 'CSS']),
('Bootstrap', 'frontend', ARRAY['Bootstrap 5', 'Twitter Bootstrap'], ARRAY['frontend', 'CSS', 'jQuery']),
('jQuery', 'frontend', ARRAY['JQuery', 'jquery'], ARRAY['frontend', 'JavaScript']),
('Redux', 'frontend', ARRAY['Redux Toolkit', 'RTK', 'Redux Saga'], ARRAY['frontend', 'React', 'State Management']),
('Webpack', 'frontend', ARRAY['webpack'], ARRAY['frontend', 'JavaScript', 'Bundler']),
('Vite', 'frontend', ARRAY['ViteJS', 'Vite.js'], ARRAY['frontend', 'JavaScript', 'Bundler']),
('Svelte', 'frontend', ARRAY['SvelteJS', 'SvelteKit'], ARRAY['frontend', 'JavaScript']),

-- ===== BACKEND (15 skills) =====
('Node.js', 'backend', ARRAY['NodeJS', 'Node', 'Node.js'], ARRAY['backend', 'JavaScript', 'Express', 'NestJS']),
('Express', 'backend', ARRAY['Express.js', 'ExpressJS'], ARRAY['backend', 'Node.js', 'JavaScript']),
('NestJS', 'backend', ARRAY['Nest.js', 'Nest'], ARRAY['backend', 'Node.js', 'TypeScript']),
('.NET', 'backend', ARRAY['.NET Framework', '.NET Core', 'DotNet', 'Dot Net', 'ASP.NET'], ARRAY['backend', 'C#', 'Azure']),
('Spring Boot', 'backend', ARRAY['Spring', 'Spring Framework', 'SpringBoot'], ARRAY['backend', 'Java', 'Microservices']),
('Django', 'backend', ARRAY['Django REST', 'Django Framework'], ARRAY['backend', 'Python', 'REST API']),
('Flask', 'backend', ARRAY['Flask Framework', 'Python Flask'], ARRAY['backend', 'Python', 'REST API']),
('FastAPI', 'backend', ARRAY['Fast API'], ARRAY['backend', 'Python', 'REST API']),
('Laravel', 'backend', ARRAY['Laravel Framework', 'Laravel PHP'], ARRAY['backend', 'PHP']),
('Ruby on Rails', 'backend', ARRAY['Rails', 'RoR', 'Ruby Rails'], ARRAY['backend', 'Ruby']),
('GraphQL', 'backend', ARRAY['Graph QL', 'GQL'], ARRAY['backend', 'API', 'Apollo']),
('REST API', 'backend', ARRAY['RESTful', 'RESTful API', 'REST', 'Restful Services'], ARRAY['backend', 'API']),
('Microservices', 'backend', ARRAY['Micro Services', 'MSA'], ARRAY['backend', 'Docker', 'Kubernetes']),
('gRPC', 'backend', ARRAY['GRPC', 'Google RPC'], ARRAY['backend', 'Microservices', 'Protocol Buffers']),
('Kafka', 'backend', ARRAY['Apache Kafka', 'Kafka Streams'], ARRAY['backend', 'Message Queue', 'Event Streaming']),

-- ===== PROGRAMMING LANGUAGES (15 skills) =====
('JavaScript', 'language', ARRAY['JS', 'ECMAScript', 'ES6', 'ES2015+'], ARRAY['frontend', 'backend', 'Node.js', 'React']),
('TypeScript', 'language', ARRAY['TS', 'Typescript'], ARRAY['JavaScript', 'Angular', 'NestJS']),
('Python', 'language', ARRAY['Python 3', 'Py'], ARRAY['backend', 'Django', 'Flask', 'AI/ML']),
('Java', 'language', ARRAY['Java SE', 'Java EE', 'JDK'], ARRAY['backend', 'Spring Boot', 'Android']),
('C#', 'language', ARRAY['CSharp', 'C Sharp', 'C-Sharp'], ARRAY['backend', '.NET', 'Unity']),
('PHP', 'language', ARRAY['PHP 8', 'PHP7'], ARRAY['backend', 'Laravel', 'WordPress']),
('Go', 'language', ARRAY['Golang', 'Go Language'], ARRAY['backend', 'Microservices', 'Cloud']),
('Rust', 'language', ARRAY['Rust Language', 'Rust Lang'], ARRAY['backend', 'Systems Programming']),
('Ruby', 'language', ARRAY['Ruby Language'], ARRAY['backend', 'Ruby on Rails']),
('Swift', 'language', ARRAY['Swift Language', 'Swift UI', 'SwiftUI'], ARRAY['mobile', 'iOS']),
('Kotlin', 'language', ARRAY['Kotlin Language', 'KT'], ARRAY['mobile', 'Android', 'Java']),
('Dart', 'language', ARRAY['Dart Language'], ARRAY['mobile', 'Flutter']),
('C++', 'language', ARRAY['CPP', 'C Plus Plus', 'Cpp'], ARRAY['Systems Programming', 'Embedded']),
('C', 'language', ARRAY['C Language', 'ANSI C'], ARRAY['Systems Programming', 'Embedded']),
('Scala', 'language', ARRAY['Scala Language'], ARRAY['backend', 'Java', 'Big Data', 'Spark']),

-- ===== DATABASE (12 skills) =====
('PostgreSQL', 'database', ARRAY['Postgres', 'PgSQL', 'PostgresQL'], ARRAY['database', 'SQL', 'Supabase']),
('MySQL', 'database', ARRAY['My SQL', 'MariaDB'], ARRAY['database', 'SQL']),
('MongoDB', 'database', ARRAY['Mongo', 'Mongo DB'], ARRAY['database', 'NoSQL', 'Node.js']),
('Redis', 'database', ARRAY['Redis Cache', 'Redis DB'], ARRAY['database', 'Caching', 'NoSQL']),
('SQL Server', 'database', ARRAY['MSSQL', 'Microsoft SQL Server', 'MS SQL'], ARRAY['database', 'SQL', '.NET']),
('Oracle', 'database', ARRAY['Oracle DB', 'Oracle Database', 'OracleDB'], ARRAY['database', 'SQL', 'Java']),
('Elasticsearch', 'database', ARRAY['Elastic Search', 'ES', 'ELK'], ARRAY['database', 'Search', 'Logging']),
('Firebase', 'database', ARRAY['Firebase DB', 'Firestore', 'Firebase Realtime'], ARRAY['database', 'NoSQL', 'Google Cloud']),
('Supabase', 'database', ARRAY['Supa Base'], ARRAY['database', 'PostgreSQL', 'Backend-as-a-Service']),
('DynamoDB', 'database', ARRAY['Dynamo DB', 'AWS DynamoDB'], ARRAY['database', 'NoSQL', 'AWS']),
('Cassandra', 'database', ARRAY['Apache Cassandra'], ARRAY['database', 'NoSQL', 'Big Data']),
('SQL', 'database', ARRAY['Structured Query Language', 'T-SQL', 'PL/SQL'], ARRAY['database', 'PostgreSQL', 'MySQL']),

-- ===== DEVOPS & CLOUD (13 skills) =====
('Docker', 'devops', ARRAY['Docker Container', 'Docker Compose'], ARRAY['devops', 'Kubernetes', 'Containerization']),
('Kubernetes', 'devops', ARRAY['K8s', 'K8', 'Kube'], ARRAY['devops', 'Docker', 'Cloud']),
('AWS', 'cloud', ARRAY['Amazon Web Services', 'Amazon AWS'], ARRAY['cloud', 'EC2', 'S3', 'Lambda']),
('Azure', 'cloud', ARRAY['Microsoft Azure', 'Azure Cloud'], ARRAY['cloud', '.NET', 'C#']),
('Google Cloud', 'cloud', ARRAY['GCP', 'Google Cloud Platform'], ARRAY['cloud', 'Firebase', 'BigQuery']),
('CI/CD', 'devops', ARRAY['CICD', 'Continuous Integration', 'Continuous Deployment', 'Continuous Delivery'], ARRAY['devops', 'Jenkins', 'GitHub Actions']),
('Jenkins', 'devops', ARRAY['Jenkins CI', 'Jenkins Pipeline'], ARRAY['devops', 'CI/CD']),
('GitHub Actions', 'devops', ARRAY['GH Actions', 'Github Action'], ARRAY['devops', 'CI/CD', 'Git']),
('Terraform', 'devops', ARRAY['Terraform IaC', 'TF'], ARRAY['devops', 'Infrastructure as Code', 'Cloud']),
('Nginx', 'devops', ARRAY['NGINX', 'nginx'], ARRAY['devops', 'Web Server', 'Reverse Proxy']),
('Linux', 'devops', ARRAY['Ubuntu', 'CentOS', 'Debian', 'RHEL'], ARRAY['devops', 'Server Administration']),
('Git', 'devops', ARRAY['GitHub', 'GitLab', 'Bitbucket', 'Version Control'], ARRAY['devops', 'Source Control']),
('Ansible', 'devops', ARRAY['Ansible Playbook', 'Red Hat Ansible'], ARRAY['devops', 'Infrastructure as Code', 'Configuration Management']),

-- ===== MOBILE (8 skills) =====
('React Native', 'mobile', ARRAY['ReactNative', 'React-Native', 'RN'], ARRAY['mobile', 'React', 'JavaScript']),
('Flutter', 'mobile', ARRAY['Flutter SDK', 'Flutter Framework'], ARRAY['mobile', 'Dart', 'Cross-Platform']),
('iOS', 'mobile', ARRAY['iOS Development', 'iPhone Development', 'Apple Development'], ARRAY['mobile', 'Swift', 'Objective-C']),
('Android', 'mobile', ARRAY['Android Development', 'Android SDK', 'Android Studio'], ARRAY['mobile', 'Kotlin', 'Java']),
('Xamarin', 'mobile', ARRAY['Xamarin Forms', 'Xamarin.Forms'], ARRAY['mobile', 'C#', '.NET']),
('Ionic', 'mobile', ARRAY['Ionic Framework'], ARRAY['mobile', 'Angular', 'Cross-Platform']),
('Swift UI', 'mobile', ARRAY['SwiftUI'], ARRAY['mobile', 'Swift', 'iOS']),
('Jetpack Compose', 'mobile', ARRAY['Compose', 'Android Compose'], ARRAY['mobile', 'Kotlin', 'Android']),

-- ===== TESTING (7 skills) =====
('Jest', 'testing', ARRAY['JestJS', 'Jest Framework'], ARRAY['testing', 'JavaScript', 'React']),
('Selenium', 'testing', ARRAY['Selenium WebDriver', 'Selenium IDE'], ARRAY['testing', 'Automation Testing', 'QA']),
('Cypress', 'testing', ARRAY['Cypress.io', 'CypressJS'], ARRAY['testing', 'E2E Testing', 'JavaScript']),
('JUnit', 'testing', ARRAY['JUnit 5', 'JUnit4'], ARRAY['testing', 'Java', 'Unit Testing']),
('Postman', 'testing', ARRAY['Postman API'], ARRAY['testing', 'API Testing', 'REST API']),
('Playwright', 'testing', ARRAY['Playwright Test'], ARRAY['testing', 'E2E Testing', 'Automation']),
('Mocha', 'testing', ARRAY['Mocha.js', 'MochaJS', 'Chai'], ARRAY['testing', 'JavaScript', 'Node.js']),

-- ===== AI / ML (8 skills) =====
('TensorFlow', 'ai_ml', ARRAY['Tensor Flow', 'TF', 'TensorFlow 2'], ARRAY['ai_ml', 'Python', 'Deep Learning']),
('PyTorch', 'ai_ml', ARRAY['Py Torch', 'PyTorch Lightning'], ARRAY['ai_ml', 'Python', 'Deep Learning']),
('Machine Learning', 'ai_ml', ARRAY['ML', 'Supervised Learning', 'Unsupervised Learning'], ARRAY['ai_ml', 'Python', 'Data Science']),
('Deep Learning', 'ai_ml', ARRAY['DL', 'Neural Networks', 'CNN', 'RNN'], ARRAY['ai_ml', 'TensorFlow', 'PyTorch']),
('NLP', 'ai_ml', ARRAY['Natural Language Processing', 'Text Mining', 'LLM'], ARRAY['ai_ml', 'Python', 'Machine Learning']),
('Computer Vision', 'ai_ml', ARRAY['CV', 'Image Recognition', 'Object Detection'], ARRAY['ai_ml', 'Deep Learning', 'OpenCV']),
('OpenAI', 'ai_ml', ARRAY['GPT', 'ChatGPT', 'GPT-4', 'GPT API'], ARRAY['ai_ml', 'NLP', 'LLM']),
('Pandas', 'ai_ml', ARRAY['Python Pandas', 'pd'], ARRAY['ai_ml', 'Python', 'Data Science', 'NumPy']),

-- ===== TOOLS & OTHER (7 skills) =====
('Jira', 'tools', ARRAY['Atlassian Jira', 'Jira Software'], ARRAY['tools', 'Project Management', 'Agile']),
('Figma', 'tools', ARRAY['Figma Design'], ARRAY['tools', 'UI/UX', 'Design']),
('Agile', 'tools', ARRAY['Agile Methodology', 'Scrum', 'Kanban', 'Agile/Scrum'], ARRAY['tools', 'Project Management']),
('RabbitMQ', 'tools', ARRAY['Rabbit MQ', 'RMQ'], ARRAY['backend', 'Message Queue', 'Microservices']),
('Nginx', 'tools', ARRAY['NGINX'], ARRAY['devops', 'Web Server', 'Load Balancer']),
('OAuth', 'tools', ARRAY['OAuth 2.0', 'OAuth2', 'OpenID Connect', 'OIDC'], ARRAY['security', 'Authentication']),
('WebSocket', 'tools', ARRAY['WebSockets', 'Socket.io', 'WS'], ARRAY['backend', 'Real-Time', 'Node.js'])

ON CONFLICT (skill_name) DO NOTHING;
