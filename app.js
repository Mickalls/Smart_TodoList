/**
 * 待办事项管理应用 - 主要JavaScript逻辑
 * ========================================
 * 
 * 这个文件包含了待办事项管理应用的所有核心功能，包括：
 * 
 * 📋 核心功能模块：
 * - 待办事项的增删改查（CRUD）
 * - 任务分类和智能分类
 * - 优先级管理
 * - 任务状态管理（待办/已完成）
 * - 回收站功能
 * - 多语言支持
 * - 主题切换（明亮/暗黑模式）
 * - 数据持久化（localStorage）
 * 
 * 🤖 AI增强功能：
 * - 智能任务分类（基于AI分析）
 * - 多AI提供商支持（DeepSeek、OpenAI、Claude）
 * - AI响应缓存机制
 * - 智能配置管理
 * - 优雅降级处理
 * 
 * 🏗️ 代码结构：
 * 1. 全局变量和配置
 * 2. AI服务相关类和函数
 * 3. 核心业务逻辑函数
 * 4. UI渲染和事件处理
 * 5. 数据存储和管理
 * 6. 初始化和启动逻辑
 * 
 * 🔧 技术特点：
 * - 原生JavaScript实现，无外部依赖
 * - 响应式设计，支持多设备
 * - 模块化代码结构
 * - 完善的错误处理
 * - 用户体验优化
 * 
 * 作者：AI Assistant
 * 创建时间：2024年
 * 版本：1.0.0（第一个AI功能点已完成）
 */

// 获取DOM元素
const todoInput = document.getElementById('todoInput');
const addTodoBtn = document.getElementById('addTodo');
const prioritySelect = document.getElementById('prioritySelect');
const todayList = document.getElementById('todayList');
const weekList = document.getElementById('weekList');
const longTermList = document.getElementById('longTermList');
const themeToggle = document.getElementById('themeToggle');
const langToggle = document.getElementById('langToggle');

// 语言配置
const translations = {
    zh: {
        title: '待办事项清单',
        placeholder: '请输入待办事项...',
        addButton: '添加',
        today: '今日任务',
        week: '本周任务',
        longTerm: '长期目标',
        completed: '已完成任务',
        todayCompleted: '今日已完成任务',
        exportDaily: '导出日报',
        stats: '任务统计',
        recycleBin: '回收站',
        emptyRecycleBin: '清空回收站',
        priority: {
            low: '低优先级',
            medium: '中优先级',
            high: '高优先级'
        },
        totalTasks: '总任务数',
        completionRate: '完成率',
        todayTasks: '今日任务数',
        todayRate: '今日完成率',
        defaultTag: '未分类',
        notification: {
            title: '任务提醒',
            body: '您有一个待办事项即将到期',
            permission: '请允许通知以接收任务提醒'
        },
        deleteConfirm: '确定要删除这个待办事项吗？'
    },
    en: {
        title: 'Todo List',
        placeholder: 'Enter a todo item...',
        addButton: 'Add',
        today: 'Today',
        week: 'This Week',
        longTerm: 'Long Term',
        completed: 'Completed',
        todayCompleted: 'Today\'s Completed',
        stats: 'Statistics',
        recycleBin: 'Recycle Bin',
        emptyRecycleBin: 'Empty Recycle Bin',
        priority: {
            low: 'Low Priority',
            medium: 'Medium Priority',
            high: 'High Priority'
        },
        totalTasks: 'Total Tasks',
        completionRate: 'Completion Rate',
        todayTasks: 'Today\'s Tasks',
        todayRate: 'Today\'s Rate',
        defaultTag: 'Untagged',
        notification: {
            title: 'Task Reminder',
            body: 'You have a todo item due soon',
            permission: 'Please allow notifications for task reminders'
        },
        deleteConfirm: 'Are you sure you want to delete this todo item?',
        exportDaily: 'Export Daily Report'
    }
};

// 导出日报功能
function exportDailyReport(event) {
    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const todayCompletedTasks = todos.filter(todo => {
        if (!todo.completed) return false;
        const todoDate = new Date(todo.dueDate);
        return todoDate.toDateString() === now.toDateString();
    });

    if (todayCompletedTasks.length === 0) {
        alert(currentLang === 'zh' ? '今日暂无已完成的任务' : 'No completed tasks for today');
        return;
    }

    let markdown = `# ${dateStr}工作日报\n\n## 今日已完成任务\n\n`;

    todayCompletedTasks.forEach((task, index) => {
        markdown += `${index + 1}. ${task.text}\n`;
    });

    if (event.type === 'contextmenu') {
        event.preventDefault();
        navigator.clipboard.writeText(markdown).then(() => {
            const toast = document.createElement('div');
            toast.className = 'toast';
            toast.textContent = currentLang === 'zh' ? '日报内容已复制到剪贴板' : 'Report content copied to clipboard';
            document.body.appendChild(toast);
            setTimeout(() => {
                toast.classList.add('show');
                setTimeout(() => {
                    toast.classList.remove('show');
                    setTimeout(() => {
                        document.body.removeChild(toast);
                    }, 300);
                }, 2000);
            }, 100);
        });
    } else {
        // 创建并下载markdown文件
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `daily_report_${dateStr.replace(/[/:]/g, '-')}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// 添加导出按钮事件监听
document.addEventListener('DOMContentLoaded', () => {
    const exportButton = document.getElementById('exportTodayCompleted');
    if (exportButton) {
        exportButton.addEventListener('click', exportDailyReport);
        exportButton.addEventListener('contextmenu', exportDailyReport);
    }
});

// 任务提醒功能
function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                checkDueTasks();
            }
        });
    }
}

function checkDueTasks() {
    const now = new Date();
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60000);
    
    todos.forEach(todo => {
        if (!todo.completed && todo.dueDate) {
            const dueDate = new Date(todo.dueDate);
            if (dueDate > now && dueDate <= thirtyMinutesFromNow) {
                showNotification(todo);
            }
        }
    });
}

function showNotification(todo) {
    if (Notification.permission === 'granted') {
        new Notification(translations[currentLang].notification.title, {
            body: `${translations[currentLang].notification.body}: ${todo.text}`,
            icon: 'favicon.ico'
        });
    }
}

// 初始化时请求通知权限
document.addEventListener('DOMContentLoaded', () => {
    requestNotificationPermission();
    // 每分钟检查一次到期任务
    setInterval(checkDueTasks, 60000);
});

// ================================
// 全局变量和数据结构
// ================================

// 从localStorage获取用户偏好设置
let currentLang = localStorage.getItem('lang') || 'zh';
let isDarkTheme = localStorage.getItem('darkTheme') === 'true';

/**
 * 待办事项数据结构
 * 
 * Todo对象包含以下字段：
 * @typedef {Object} Todo
 * @property {string} text - 任务描述文本
 * @property {boolean} completed - 任务是否已完成
 * @property {string} priority - 优先级（low/medium/high）
 * @property {string} tag - 任务分类标签（工作/学习/生活/其他）
 * @property {string} dueDate - 截止日期（ISO字符串格式）
 * @property {string} createdAt - 创建时间（ISO字符串格式）
 * @property {Object} [aiEnhanced] - AI增强信息（可选）
 * @property {string} [aiEnhanced.suggestedTag] - AI建议的分类标签
 * @property {string} [aiEnhanced.provider] - 使用的AI提供商
 * @property {string} [aiEnhanced.model] - 使用的AI模型
 * @property {string} [aiEnhanced.timestamp] - AI处理时间
 * 
 * 示例：
 * {
 *   text: "完成项目报告",
 *   completed: false,
 *   priority: "high",
 *   tag: "工作",
 *   dueDate: "2024-07-05T23:59:59.000Z",
 *   createdAt: "2024-07-04T10:30:00.000Z",
 *   aiEnhanced: {
 *     suggestedTag: "工作",
 *     provider: "deepseek",
 *     model: "deepseek-chat",
 *     timestamp: "2024-07-04T10:30:01.000Z"
 *   }
 * }
 */

// 从localStorage获取待办事项数据
let todos = JSON.parse(localStorage.getItem('todos')) || [];

/**
 * 回收站数据结构
 * 
 * 回收站中的项目包含原始Todo对象plus删除信息：
 * @typedef {Object} RecycledTodo
 * @property {Todo} todo - 原始待办事项对象
 * @property {string} deletedAt - 删除时间（ISO字符串格式）
 * @property {number} autoDeleteAt - 自动删除时间戳（30天后）
 */
let recycleBin = JSON.parse(localStorage.getItem('recycleBin')) || [];

/**
 * 标签系统
 * 
 * 支持的默认标签分类，支持多语言
 * 用户可以自定义标签，数据存储在localStorage中
 */
let tags = JSON.parse(localStorage.getItem('tags')) || ['工作', '学习', '生活', '其他'];

// ================================
// AI服务相关代码
// ================================

/**
 * AI配置管理器
 * 负责管理AI相关的配置信息，包括API密钥、提供商选择、功能开关等
 */
class AIConfigManager {
    /**
     * 获取AI配置
     * @returns {Object} AI配置对象
     */
    static getConfig() {
        const defaultConfig = {
            enabled: true, // 默认启用AI
            rememberChoice: true, // 默认记住选择
            features: {
                autoClassification: true  // 自动分类功能开关
            },
            apiConfig: {
                provider: 'deepseek',           // AI提供商
                apiKey: '',                     // API密钥
                baseURL: 'https://api.deepseek.com', // API基础地址
                model: 'deepseek-chat'          // 使用的模型
            }
        };
        
        const savedConfig = localStorage.getItem('aiConfig');
        if (savedConfig) {
            return { ...defaultConfig, ...JSON.parse(savedConfig) };
        }
        return defaultConfig;
    }
    
    /**
     * 保存AI配置到localStorage
     * @param {Object} config - 要保存的配置对象
     */
    static saveConfig(config) {
        localStorage.setItem('aiConfig', JSON.stringify(config));
    }
    
    /**
     * 获取可用的AI提供商配置
     * @returns {Object} 包含所有支持的AI提供商配置
     */
    static getProviderConfigs() {
        return {
            deepseek: {
                name: 'DeepSeek (推荐)',
                baseURL: 'https://api.deepseek.com',
                models: [
                    { value: 'deepseek-chat', name: 'deepseek-chat' },
                    { value: 'deepseek-coder', name: 'deepseek-coder' }
                ]
            },
            openai: {
                name: 'OpenAI',
                baseURL: 'https://api.openai.com',
                models: [
                    { value: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
                    { value: 'gpt-4', name: 'GPT-4' },
                    { value: 'gpt-4-turbo', name: 'GPT-4 Turbo' }
                ]
            },
            claude: {
                name: 'Claude',
                baseURL: 'https://api.anthropic.com',
                models: [
                    { value: 'claude-3-haiku', name: 'Claude 3 Haiku' },
                    { value: 'claude-3-sonnet', name: 'Claude 3 Sonnet' },
                    { value: 'claude-3-opus', name: 'Claude 3 Opus' }
                ]
            },
            custom: {
                name: '自定义',
                baseURL: '',
                models: [
                    { value: 'custom-model', name: '自定义模型' }
                ]
            }
        };
    }
}

/**
 * AI响应缓存管理器
 * 负责管理AI API响应的缓存，避免重复调用API，提高性能
 */
class AIResponseManager {
    /**
     * 生成输入文本的哈希值作为缓存键
     * @param {string} text - 输入文本
     * @param {string} type - 请求类型（如'classification'）
     * @returns {string} 16位哈希值
     */
    static hashInput(text, type) {
        return btoa(encodeURIComponent(`${type}:${text}`)).substring(0, 16);
    }
    
    /**
     * 获取有效的缓存响应
     * @param {string} text - 输入文本
     * @param {string} type - 请求类型
     * @returns {string|null} 缓存的响应结果，如果未找到或已过期则返回null
     */
    static getValidResponse(text, type) {
        const responses = JSON.parse(localStorage.getItem('aiResponses') || '{}');
        const hash = this.hashInput(text, type);
        const response = responses[hash];
        
        if (response && new Date(response.expiresAt) > new Date()) {
            return response.output;
        }
        return null;
    }
    
    /**
     * 保存AI响应到缓存
     * @param {string} text - 输入文本
     * @param {string} type - 请求类型
     * @param {string} output - AI响应结果
     * @param {number} expirationHours - 过期时间（小时），默认24小时
     */
    static saveResponse(text, type, output, expirationHours = 24) {
        const responses = JSON.parse(localStorage.getItem('aiResponses') || '{}');
        const hash = this.hashInput(text, type);
        const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
        
        responses[hash] = {
            type,
            input: text,
            output,
            timestamp: new Date().toISOString(),
            expiresAt: expiresAt.toISOString()
        };
        
        localStorage.setItem('aiResponses', JSON.stringify(responses));
    }
}

/**
 * AI API客户端
 * 负责与AI服务提供商的API进行通信
 */
class AIAPIClient {
    /**
     * 构造函数
     * @param {Object} config - API配置对象
     * @param {string} config.apiKey - API密钥
     * @param {string} config.baseURL - API基础地址
     * @param {string} config.model - 使用的模型名称
     */
    constructor(config) {
        this.apiKey = config.apiKey;
        this.baseURL = config.baseURL || 'https://api.deepseek.com';
        this.model = config.model || 'deepseek-chat';
    }
    
    /**
     * 发送API请求
     * @param {string} endpoint - API端点
     * @param {Object} data - 请求数据
     * @returns {Promise<Object>} API响应结果
     * @throws {Error} 当API密钥未配置或请求失败时抛出错误
     */
    async request(endpoint, data) {
        if (!this.apiKey) {
            throw new Error('API密钥未配置');
        }
        
        const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
        }
        
        return await response.json();
    }
}

/**
 * AI服务主类
 * 提供各种AI增强功能的核心业务逻辑
 */
class AIService {
    /**
     * 构造函数 - 初始化AI服务
     */
    constructor() {
        const config = AIConfigManager.getConfig();
        this.client = new AIAPIClient(config.apiConfig);
    }
    
    /**
     * 任务分类功能
     * 使用AI分析任务描述，自动分类到[工作,学习,生活,其他]中的一个
     * @param {string} text - 任务描述文本
     * @returns {Promise<string>} 分类结果
     */
    async classifyTask(text) {
        const prompt = `请分析以下任务描述，从[工作,学习,生活,其他]中选择最合适的分类，只返回分类结果：\n${text}`;
        
        const response = await this.client.request('/v1/chat/completions', {
            model: this.client.model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 10,
            temperature: 0.1
        });
        
        return this.parseClassificationResponse(response);
    }
    
    /**
     * 解析分类响应
     * @param {Object} response - AI API响应对象
     * @returns {string} 解析后的分类结果
     */
    parseClassificationResponse(response) {
        const content = response.choices[0]?.message?.content || '';
        const validTags = ['工作', '学习', '生活', '其他'];
        
        for (const tag of validTags) {
            if (content.includes(tag)) {
                return tag;
            }
        }
        return '其他'; // 默认分类
    }
}

/**
 * 获取AI任务分类建议
 * 这是外部调用的主要函数，集成了缓存机制和错误处理
 * @param {string} text - 任务描述文本
 * @returns {Promise<string|null>} 分类建议，失败时返回null
 */
async function getAIClassification(text) {
    try {
        // 检查AI功能是否启用
        const config = AIConfigManager.getConfig();
        if (!config.enabled || !config.features.autoClassification) {
            return null;
        }
        
        // 检查缓存
        const cached = AIResponseManager.getValidResponse(text, 'classification');
        if (cached) {
            console.log('使用缓存的AI分类结果:', cached);
            return cached;
        }
        
        // 调用AI服务
        const aiService = new AIService();
        const result = await aiService.classifyTask(text);
        
        // 保存到缓存
        AIResponseManager.saveResponse(text, 'classification', result);
        
        console.log('AI分类结果:', result);
        return result;
    } catch (error) {
        console.error('AI分类失败:', error);
        return null;
    }
}

/**
 * 显示AI分类建议
 * 在用户界面中显示AI推荐的分类标签，用户可以选择接受或忽略
 * @param {string} suggestedTag - AI建议的分类标签
 * @param {string} text - 原始任务文本
 */
function showAISuggestion(suggestedTag, text) {
    const aiSuggestion = document.getElementById('aiSuggestion');
    const aiSuggestionTags = document.getElementById('aiSuggestionTags');
    
    // 清空之前的建议
    aiSuggestionTags.innerHTML = '';
    
    // 创建建议标签按钮
    const tagButton = document.createElement('button');
    tagButton.className = 'ai-suggestion-tag';
    tagButton.textContent = suggestedTag;
    tagButton.addEventListener('click', () => {
        acceptAISuggestion(suggestedTag);
    });
    
    aiSuggestionTags.appendChild(tagButton);
    
    // 显示建议区域
    aiSuggestion.style.display = 'block';
}

/**
 * 接受AI建议
 * 用户点击AI建议标签时调用，自动设置标签选择器并隐藏建议区域
 * @param {string} suggestedTag - 用户选择的AI建议标签
 */
function acceptAISuggestion(suggestedTag) {
    const tagSelect = document.getElementById('tagSelect');
    
    // 设置标签选择器的值
    tagSelect.value = suggestedTag;
    
    // 隐藏AI建议区域
    hideAISuggestion();
    
    console.log('用户接受了AI建议:', suggestedTag);
}

/**
 * 隐藏AI建议区域
 * 当用户忽略建议或已经接受建议时调用
 */
function hideAISuggestion() {
    const aiSuggestion = document.getElementById('aiSuggestion');
    aiSuggestion.style.display = 'none';
}

// 更新语言
function updateLanguage() {
    document.querySelector('h1').textContent = translations[currentLang].title;
    todoInput.placeholder = translations[currentLang].placeholder;
    addTodoBtn.textContent = translations[currentLang].addButton;
    langToggle.textContent = currentLang === 'zh' ? 'EN' : '中';
    document.querySelectorAll('.todo-column h2').forEach(h2 => {
        const type = h2.parentElement.querySelector('.todo-list').dataset.type;
        h2.textContent = translations[currentLang][type];
    });
    prioritySelect.querySelectorAll('option').forEach(option => {
        option.textContent = translations[currentLang].priority[option.value];
    });
    renderTodos();
}

// 更新主题
function updateTheme() {
    document.body.classList.toggle('dark-theme', isDarkTheme);
    themeToggle.textContent = isDarkTheme ? '🌛' : '🌞';
}

// 智能分类任务
function classifyTodo(todo) {
    try {
        const now = new Date();
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59);
        
        if (!todo.dueDate) {
            return 'longTerm';
        }
        
        const dueDate = new Date(todo.dueDate);
        if (isNaN(dueDate.getTime())) {
            return 'longTerm';
        }
        
        if (dueDate <= todayEnd) {
            return 'today';
        } else if (dueDate <= weekEnd) {
            return 'week';
        }
        return 'longTerm';
    } catch (error) {
        console.error('Error in classifyTodo:', error);
        return 'longTerm';
    }
}

// 渲染待办事项列表
function renderTodos() {
    const lists = {
        today: todayList,
        week: weekList,
        longTerm: longTermList,
        todayCompleted: document.getElementById('todayCompletedList'),
        completed: document.getElementById('completedList')
    };
    
    // 清空所有列表
    Object.values(lists).forEach(list => {
        list.innerHTML = '';
    });
    
    todos.forEach((todo, index) => {
        const li = document.createElement('li');
        li.className = `todo-item priority-${todo.priority} ${todo.completed ? 'completed' : ''}`;
        li.draggable = true;
        li.dataset.index = index;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'todo-checkbox';
        checkbox.checked = todo.completed;
        checkbox.addEventListener('change', () => toggleTodo(index));
        
        const span = document.createElement('span');
        span.className = 'todo-text';
        span.textContent = todo.text;
        
        const tagSpan = document.createElement('span');
        tagSpan.className = 'todo-tag';
        tagSpan.textContent = todo.tag || translations[currentLang].defaultTag;
        
        li.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showTodoMenu(e, index);
        });
        
        li.appendChild(checkbox);
        li.appendChild(span);
        li.appendChild(tagSpan);
        
        // 修改任务分类逻辑：区分今日已完成任务和其他已完成任务
        const todoType = classifyTodo(todo);
        let targetList;
        if (todo.completed) {
            const now = new Date();
            const todoDate = new Date(todo.dueDate);
            if (todoDate.toDateString() === now.toDateString()) {
                targetList = lists['todayCompleted'];
            } else {
                targetList = lists['completed'];
            }
        } else {
            targetList = lists[todoType];
        }
        targetList.appendChild(li);
        
        li.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', index.toString());
        });
    });
    
    localStorage.setItem('todos', JSON.stringify(todos));
}

function showTodoMenu(event, index) {
    event.stopPropagation();
    event.preventDefault();
    
    const existingMenu = document.querySelector('.todo-context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }

    const menu = document.createElement('div');
    menu.className = 'todo-context-menu';
    
    const menuItems = [
        { text: '编辑名称', action: () => editTodoName(index) },
        { text: '置顶', action: () => pinTodo(index) },
        { text: '删除', action: () => {
            if (confirm(translations[currentLang].deleteConfirm)) {
                deleteTodo(index);
            }
        }}
    ];

    menuItems.forEach(item => {
        const menuItem = document.createElement('div');
        menuItem.className = 'menu-item';
        menuItem.textContent = item.text;
        menuItem.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            item.action();
            menu.remove();
        });
        menu.appendChild(menuItem);
    });

    const rect = event.currentTarget.getBoundingClientRect();
    document.body.appendChild(menu);
    const menuRect = menu.getBoundingClientRect();
    
    let top = rect.bottom + window.scrollY;
    let left = rect.left + window.scrollX;

    if (left + menuRect.width > window.innerWidth) {
        left = window.innerWidth - menuRect.width - 5;
    }

    if (top + menuRect.height > window.innerHeight + window.scrollY) {
        top = rect.top + window.scrollY - menuRect.height;
    }

    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;

    requestAnimationFrame(() => {
        menu.style.opacity = '1';
        menu.style.transform = 'scale(1)';
    });

    const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
            menu.style.opacity = '0';
            menu.style.transform = 'scale(0.95)';
            setTimeout(() => {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }, 150);
        }
    };

    document.addEventListener('click', closeMenu);
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeMenu({ target: document.body });
        }
    }, { once: true });
}

function editTodoName(index) {
    const todo = todos[index];
    const newName = prompt('请输入新的任务名称：', todo.text);
    if (newName && newName.trim()) {
        todo.text = newName.trim();
        localStorage.setItem('todos', JSON.stringify(todos));
        renderTodos();
    }
}

function pinTodo(index) {
    const todo = todos.splice(index, 1)[0];
    todos.unshift(todo);
    localStorage.setItem('todos', JSON.stringify(todos));
    renderTodos();
}

// 为每个列表添加事件委托
function setupEventDelegation() {
    document.querySelectorAll('.todo-list').forEach(list => {
        // 移除旧的事件监听器
        const oldListener = list._clickListener;
        if (oldListener) {
            list.removeEventListener('click', oldListener);
        }
        // 添加新的事件监听器
        const newListener = handleTodoClick;
        list._clickListener = newListener;
        list.addEventListener('click', newListener);
    });
}

// 处理待办事项点击事件
function handleTodoClick(e) {
    if (e.target.classList.contains('delete-todo')) {
        console.log('删除按钮被点击');
        const li = e.target.closest('.todo-item');
        if (li) {
            console.log('成功找到待删除的任务项');
            const index = parseInt(li.dataset.index);
            if (!isNaN(index) && index >= 0 && index < todos.length) {
                console.log('任务索引有效：', index);
                if (confirm(translations[currentLang].deleteConfirm)) {
                    console.log('用户确认删除');
                    li.classList.add('deleting');
                    console.log('删除动画开始');
                    setTimeout(() => {
                        deleteTodo(index);
                    }, 300);
                } else {
                    console.log('用户取消删除');
                }
            } else {
                console.log('任务索引无效：', index);
            }
        } else {
            console.log('未找到待删除的任务项');
        }
    }
}

function deleteTodo(index) {
    console.log('开始执行删除操作，索引：', index);
    const deletedTodo = todos.splice(index, 1)[0];
    deletedTodo.deletedAt = new Date().toISOString();
    recycleBin.push(deletedTodo);
    console.log('将任务移动到回收站');
    localStorage.setItem('todos', JSON.stringify(todos));
    localStorage.setItem('recycleBin', JSON.stringify(recycleBin));
    console.log('更新本地存储');
    renderTodos();
    renderRecycleBin();
    console.log('重新渲染任务列表和回收站');
}

function renderRecycleBin() {
    const recycleBinList = document.getElementById('recycleBinList');
    recycleBinList.innerHTML = '';
    
    recycleBin.forEach((todo, index) => {
        const li = document.createElement('li');
        li.className = `todo-item priority-${todo.priority}`;
        li.dataset.index = index;
        
        const span = document.createElement('span');
        span.className = 'todo-text';
        span.textContent = todo.text;
        
        const restoreBtn = document.createElement('button');
        restoreBtn.className = 'restore-todo';
        restoreBtn.innerHTML = '↩';
        restoreBtn.addEventListener('click', () => restoreTodo(index));
        
        li.appendChild(span);
        li.appendChild(restoreBtn);
        recycleBinList.appendChild(li);
    });
}

function restoreTodo(index) {
    console.log('开始执行还原操作，索引：', index);
    if (index >= 0 && index < recycleBin.length) {
        console.log('回收站当前项目数量：', recycleBin.length);
        const restoredTodo = recycleBin.splice(index, 1)[0];
        console.log('从回收站中移除的项目：', restoredTodo);
        console.log('项目详情：', JSON.stringify(restoredTodo, null, 2));
        delete restoredTodo.deletedAt;
        console.log('删除deletedAt属性后的项目：', JSON.stringify(restoredTodo, null, 2));
        todos.push(restoredTodo);
        console.log('添加到待办事项列表，当前任务数量：', todos.length);
        localStorage.setItem('todos', JSON.stringify(todos));
        localStorage.setItem('recycleBin', JSON.stringify(recycleBin));
        console.log('更新本地存储完成，回收站剩余项目：', recycleBin.length);
        console.log('开始重新渲染列表...');
        renderTodos();
        renderRecycleBin();
        console.log('重新渲染列表完成');
    } else {
        console.error('无效的回收站索引：', index, '当前回收站长度：', recycleBin.length);
    }
}

function emptyRecycleBin() {
    const itemCount = recycleBin.length;
    if (itemCount === 0) {
        alert(translations[currentLang].recycleBinEmpty || '回收站已经是空的');
        return;
    }

    const confirmMessage = `${translations[currentLang].emptyRecycleBinConfirm}\n当前回收站中有 ${itemCount} 个项目。`;
    if (confirm(confirmMessage)) {
        recycleBin = [];
        localStorage.setItem('recycleBin', JSON.stringify(recycleBin));
        renderRecycleBin();
        alert(`已成功清空回收站，共删除 ${itemCount} 个项目。`);
    }
}

// 清理超过30天的回收站项目
function cleanupRecycleBin() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    recycleBin = recycleBin.filter(todo => {
        const deletedAt = new Date(todo.deletedAt);
        return deletedAt > thirtyDaysAgo;
    });
    
    localStorage.setItem('recycleBin', JSON.stringify(recycleBin));
    renderRecycleBin();
}

// 初始化时添加回收站相关的事件监听
document.addEventListener('DOMContentLoaded', () => {
    // 每分钟检查一次到期任务
    setInterval(checkDueTasks, 60000);
    document.getElementById('emptyRecycleBin').addEventListener('click', emptyRecycleBin);
    renderRecycleBin();
    // 每天执行一次回收站清理
    setInterval(cleanupRecycleBin, 24 * 60 * 60 * 1000);
});

/**
 * 添加待办事项 (支持AI智能分类)
 * 核心功能：处理用户输入的待办事项，支持AI智能分类和手动分类
 * 
 * 流程说明：
 * 1. 验证用户输入
 * 2. 如果选择了智能分类，调用AI进行分类
 * 3. 显示AI建议供用户选择
 * 4. 创建todo对象并保存
 * 5. 更新UI显示
 * 
 * AI增强功能：
 * - 智能分类：基于任务描述自动推荐分类
 * - 缓存机制：避免重复API调用
 * - 优雅降级：AI失败时使用默认分类
 */
async function addTodo() {
    const text = todoInput.value.trim();
    const tagSelect = document.getElementById('tagSelect');
    
    if (!text) return;
    
    let selectedTag = tagSelect.value;
    let aiEnhanced = {}; // 存储AI增强信息
    
    // 如果用户选择了智能分类
    if (selectedTag === 'ai-classify') {
        try {
            // 显示加载状态
            const addButton = document.getElementById('addTodo');
            const originalText = addButton.textContent;
            addButton.textContent = '🤖 AI分析中...';
            addButton.disabled = true;
            
            // 获取AI分类建议
            const suggestedTag = await getAIClassification(text);
            
            // 恢复按钮状态
            addButton.textContent = originalText;
            addButton.disabled = false;
            
            if (suggestedTag) {
                // 显示AI建议，让用户选择
                showAISuggestion(suggestedTag, text);
                aiEnhanced.suggestedTag = suggestedTag;
                selectedTag = suggestedTag; // 默认使用AI建议
            } else {
                // AI分类失败，使用默认分类
                selectedTag = '其他';
                console.log('AI分类失败，使用默认分类');
            }
        } catch (error) {
            console.error('AI分类出错:', error);
            selectedTag = '其他';
            
            // 恢复按钮状态
            const addButton = document.getElementById('addTodo');
            addButton.textContent = '添加';
            addButton.disabled = false;
        }
    }
    
    // 创建todo对象
    const todo = {
        text,
        completed: false,
        priority: prioritySelect.value,
        tag: selectedTag,
        dueDate: new Date().toISOString(),
        createdAt: new Date().toISOString()
    };
    
    // 如果有AI增强信息，添加到todo对象
    if (Object.keys(aiEnhanced).length > 0) {
        todo.aiEnhanced = aiEnhanced;
    }
    
    // 添加到todos数组
    todos.push(todo);
    
    // 清空输入框并重置标签选择
    todoInput.value = '';
    if (tagSelect.value === 'ai-classify') {
        tagSelect.value = '工作'; // 重置为默认选项
    }
    
    // 重新渲染
    renderTodos();
}

// 切换待办事项状态
function toggleTodo(index) {
    todos[index].completed = !todos[index].completed;
    localStorage.setItem('todos', JSON.stringify(todos));
    renderTodos();
}

// 事件监听
addTodoBtn.addEventListener('click', addTodo);
todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTodo();
    }
});

// 主题切换事件监听
themeToggle.addEventListener('click', () => {
    isDarkTheme = !isDarkTheme;
    localStorage.setItem('darkTheme', isDarkTheme);
    updateTheme();
});

// 语言切换事件监听
langToggle.addEventListener('click', () => {
    currentLang = currentLang === 'zh' ? 'en' : 'zh';
    localStorage.setItem('lang', currentLang);
    updateLanguage();
});

// 添加拖拽目标事件监听
document.querySelectorAll('.todo-list').forEach(list => {
    list.addEventListener('dragover', (e) => {
        e.preventDefault();
    });
    
    list.addEventListener('drop', (e) => {
        e.preventDefault();
        const todoIndex = parseInt(e.dataTransfer.getData('text/plain'));
        const targetType = e.currentTarget.dataset.type;
        
        // 更新任务的到期日期
        const now = new Date();
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59);
        
        switch(targetType) {
            case 'today':
                todos[todoIndex].dueDate = todayEnd.toISOString();
                break;
            case 'week':
                todos[todoIndex].dueDate = weekEnd.toISOString();
                break;
            case 'longTerm':
                const monthDate = new Date(now);
                monthDate.setMonth(monthDate.getMonth() + 1);
                monthDate.setHours(23, 59, 59);
                todos[todoIndex].dueDate = monthDate.toISOString();
                break;
        }
        
        renderTodos();
    });
});

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    requestNotificationPermission();
    updateTheme();
    updateLanguage();
    renderTagSelect();
    
    // 如果AI启用且记住选择，默认选择智能分类
    const aiConfig = AIConfigManager.getConfig();
    if (aiConfig.enabled && aiConfig.rememberChoice) {
        const tagSelect = document.getElementById('tagSelect');
        if (tagSelect && tagSelect.querySelector('option[value="ai-classify"]')) {
            tagSelect.value = 'ai-classify';
        }
    }
    
    renderTodos();
    setupEventDelegation();
    setupAIEventListeners(); // 设置AI相关事件监听器
    // 每分钟检查一次到期任务
    setInterval(checkDueTasks, 60000);
});

/**
 * 设置AI相关事件监听器
 * 在页面初始化时调用，绑定所有AI功能相关的事件处理
 */
function setupAIEventListeners() {
    // 忽略AI建议按钮
    const dismissButton = document.getElementById('dismissAiSuggestion');
    if (dismissButton) {
        dismissButton.addEventListener('click', hideAISuggestion);
    }
    
    // 监听标签选择变化
    const tagSelect = document.getElementById('tagSelect');
    if (tagSelect) {
        tagSelect.addEventListener('change', (e) => {
            // 如果用户手动选择了其他标签，隐藏AI建议
            if (e.target.value !== 'ai-classify') {
                hideAISuggestion();
            }
        });
    }
    
    // 监听输入框变化，当用户修改输入时隐藏AI建议
    const todoInput = document.getElementById('todoInput');
    if (todoInput) {
        todoInput.addEventListener('input', () => {
            hideAISuggestion();
        });
    }
    
    // AI配置按钮
    const aiConfigToggle = document.getElementById('aiConfigToggle');
    if (aiConfigToggle) {
        aiConfigToggle.addEventListener('click', showAIConfigModal);
    }
    
    // AI配置弹窗相关事件
    const saveAiConfig = document.getElementById('saveAiConfig');
    const closeAiConfig = document.getElementById('closeAiConfig');
    const aiConfigModal = document.getElementById('aiConfigModal');
    
    if (saveAiConfig) {
        saveAiConfig.addEventListener('click', saveAIConfig);
    }
    
    if (closeAiConfig) {
        closeAiConfig.addEventListener('click', hideAIConfigModal);
    }
    
    // 点击弹窗外部关闭
    if (aiConfigModal) {
        aiConfigModal.addEventListener('click', (e) => {
            if (e.target === aiConfigModal) {
                hideAIConfigModal();
            }
        });
    }
}

/**
 * 显示AI配置弹窗
 * 打开AI配置界面，允许用户配置AI提供商、API密钥等设置
 */
function showAIConfigModal() {
    const modal = document.getElementById('aiConfigModal');
    const providerSelect = document.getElementById('aiProvider');
    const modelSelect = document.getElementById('aiModel');
    const baseUrlInput = document.getElementById('aiBaseUrl');
    const apiKeyInput = document.getElementById('aiApiKey');
    const enabledCheckbox = document.getElementById('aiEnabled');
    const rememberCheckbox = document.getElementById('aiRememberChoice');
    
    // 加载当前配置
    const config = AIConfigManager.getConfig();
    const providers = AIConfigManager.getProviderConfigs();
    
    // 填充提供商选项
    providerSelect.innerHTML = '';
    Object.keys(providers).forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = providers[key].name;
        providerSelect.appendChild(option);
    });
    
    // 设置当前值
    providerSelect.value = config.apiConfig.provider || 'deepseek';
    baseUrlInput.value = config.apiConfig.baseURL || '';
    apiKeyInput.value = config.apiConfig.apiKey || '';
    enabledCheckbox.checked = config.enabled;
    rememberCheckbox.checked = config.rememberChoice;
    
    // 更新模型选项
    updateModelOptions();
    modelSelect.value = config.apiConfig.model || 'deepseek-chat';
    
    // 监听提供商变化
    providerSelect.addEventListener('change', onProviderChange);
    
    modal.style.display = 'flex';
}

/**
 * 处理AI提供商变化
 * 当用户选择不同的AI提供商时，自动更新API地址和可用模型
 */
function onProviderChange() {
    const providerSelect = document.getElementById('aiProvider');
    const baseUrlInput = document.getElementById('aiBaseUrl');
    const providers = AIConfigManager.getProviderConfigs();
    
    const selectedProvider = providers[providerSelect.value];
    if (selectedProvider) {
        baseUrlInput.value = selectedProvider.baseURL;
        updateModelOptions();
    }
}

/**
 * 更新模型选项下拉框
 * 根据当前选择的AI提供商，更新可用的模型选项
 */
function updateModelOptions() {
    const providerSelect = document.getElementById('aiProvider');
    const modelSelect = document.getElementById('aiModel');
    const providers = AIConfigManager.getProviderConfigs();
    
    const selectedProvider = providers[providerSelect.value];
    if (selectedProvider) {
        modelSelect.innerHTML = '';
        selectedProvider.models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.value;
            option.textContent = model.name;
            modelSelect.appendChild(option);
        });
    }
}

/**
 * 隐藏AI配置弹窗
 * 关闭AI配置界面
 */
function hideAIConfigModal() {
    const modal = document.getElementById('aiConfigModal');
    modal.style.display = 'none';
}

/**
 * 保存AI配置
 * 验证用户输入并保存AI配置到localStorage
 */
function saveAIConfig() {
    const providerSelect = document.getElementById('aiProvider');
    const modelSelect = document.getElementById('aiModel');
    const baseUrlInput = document.getElementById('aiBaseUrl');
    const apiKeyInput = document.getElementById('aiApiKey');
    const enabledCheckbox = document.getElementById('aiEnabled');
    const rememberCheckbox = document.getElementById('aiRememberChoice');
    
    const provider = providerSelect.value;
    const model = modelSelect.value;
    const baseURL = baseUrlInput.value.trim();
    const apiKey = apiKeyInput.value.trim();
    const enabled = enabledCheckbox.checked;
    const rememberChoice = rememberCheckbox.checked;
    
    // 验证必填项
    if (enabled && !apiKey) {
        alert('请输入有效的API密钥');
        return;
    }
    
    // 创建新配置
    const config = {
        enabled,
        rememberChoice,
        features: {
            autoClassification: true
        },
        apiConfig: {
            provider,
            model,
            baseURL,
            apiKey
        }
    };
    
    // 保存配置
    AIConfigManager.saveConfig(config);
    
    // 重新渲染标签选择框以反映AI状态变化
    renderTagSelect();
    
    // 显示成功提示
    const saveBtn = document.getElementById('saveAiConfig');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = '✓ 已保存';
    
    setTimeout(() => {
        saveBtn.textContent = originalText;
        hideAIConfigModal();
    }, 1000);
    
    console.log('AI配置已保存:', config);
}

// 标签系统 - 已在文件开头声明

/**
 * 渲染标签选择下拉框
 * 根据AI配置状态动态生成标签选择选项，智能分类选项的位置和状态会根据AI是否启用而变化
 */
function renderTagSelect() {
    const tagSelect = document.getElementById('tagSelect');
    if (!tagSelect) return;
    
    tagSelect.innerHTML = '';
    
    // 根据当前语言设置标签
    const defaultTags = currentLang === 'zh' ? 
        ['工作', '学习', '生活', '其他'] : 
        ['Work', 'Study', 'Life', 'Other'];
    
    // 更新本地存储中的标签
    tags = JSON.parse(localStorage.getItem('tags')) || defaultTags;
    localStorage.setItem('tags', JSON.stringify(tags));
    
    // 检查AI是否启用
    const aiConfig = AIConfigManager.getConfig();
    
    // 如果AI启用，优先添加智能分类选项
    if (aiConfig.enabled) {
        const aiOption = document.createElement('option');
        aiOption.value = 'ai-classify';
        aiOption.textContent = currentLang === 'zh' ? '🤖 智能分类' : '🤖 AI Classify';
        tagSelect.appendChild(aiOption);
    }
    
    // 添加普通标签选项
    tags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        tagSelect.appendChild(option);
    });
    
    // 如果AI未启用，在最后添加智能分类选项（禁用状态）
    if (!aiConfig.enabled) {
        const aiOption = document.createElement('option');
        aiOption.value = 'ai-classify';
        aiOption.textContent = currentLang === 'zh' ? '🤖 智能分类 (未启用)' : '🤖 AI Classify (Disabled)';
        aiOption.disabled = true;
        tagSelect.appendChild(aiOption);
    }
}