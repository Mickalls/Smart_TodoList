/**
 * AI服务模块
 * ============
 * 
 * 包含所有AI增强功能的类和函数：
 * - AI配置管理
 * - AI响应缓存
 * - AI API客户端
 * - AI服务核心逻辑
 * - AI相关UI交互
 */

// ================================
// AI配置管理器
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

// ================================
// AI响应缓存管理器
// ================================

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

// ================================
// AI API客户端
// ================================

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

// ================================
// AI服务主类
// ================================

/**
 * AI服务主类
 * 提供各种AI增强功能的核心业务逻辑
 */
class AIService {
    /**
     * 构造函数 - 初始化AI服务
     */
    constructor() {
        this.config = AIConfigManager.getConfig();
        this.client = new AIAPIClient(this.config.apiConfig);
        this.apiClient = this.client; // 为了兼容性，添加一个别名
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
    
    /**
     * 任务描述优化功能
     * 使用AI分析用户输入的简单描述，提供更详细、更具可执行性的任务描述建议
     * @param {string} text - 原始任务描述文本
     * @returns {Promise<string>} 优化后的任务描述
     */
    async optimizeTaskDescription(text) {
        const prompt = `请优化以下任务描述，使其更加具体、可执行和明确。

原始描述：${text}

要求：
1. 更加具体和可执行
2. 包含必要的时间、地点、方式等细节
3. 保持简洁明了
4. 只返回优化后的任务描述，不要任何前缀、解释或格式化文字

直接输出优化后的描述：`;
        
        const response = await this.client.request('/v1/chat/completions', {
            model: this.client.model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 200,
            temperature: 0.7
        });
        
        return this.parseOptimizationResponse(response);
    }
    
    /**
     * 解析优化响应
     * @param {Object} response - AI API响应对象
     * @returns {string} 解析后的优化结果
     */
    parseOptimizationResponse(response) {
        let content = response.choices[0]?.message?.content || '';
        content = content.trim();
        
        // 移除可能的前缀文字
        const prefixPatterns = [
            /^优化后的描述：?\s*/,
            /^优化建议：?\s*/,
            /^建议：?\s*/,
            /^任务描述：?\s*/,
            /^描述：?\s*/,
            /^优化后：?\s*/,
            /^结果：?\s*/,
            /^答案：?\s*/,
            /^回答：?\s*/,
            /^以下是.*?：?\s*/,
            /^\d+\.\s*/,
            /^[\-\*]\s*/,
            /^「.*?」\s*/,
            /^".*?"\s*/
        ];
        
        for (const pattern of prefixPatterns) {
            content = content.replace(pattern, '');
        }
        
        // 移除可能的引号包围
        content = content.replace(/^["'「『](.*)["'」』]$/, '$1');
        
        return content.trim();
    }

    /**
     * 智能时间规划
     * 基于用户任务列表生成合理的时间安排建议
     * @param {Array} tasks - 任务列表
     * @param {Object} preferences - 用户偏好设置
     * @returns {Promise<Object>} 时间规划建议
     */
    async generateSmartSchedule(tasks, preferences = {}) {
        const currentDate = new Date().toLocaleDateString('zh-CN');
        const availableHours = preferences.availableHours || 10; // 默认10小时工作时间
        
        const prompt = `作为时间管理专家，请为以下任务生成今日（${currentDate}）的智能时间规划。

任务列表：
${tasks.map((task, index) => 
    `${index + 1}. ${task.text} (优先级: ${task.priority}, 分类: ${task.tag})`
).join('\n')}

规划要求：
1. 根据任务优先级和复杂度估算每个任务的时长（15分钟-4小时）
2. 按照时间段安排任务：上午(9:00-12:00)、下午(14:00-18:00)、晚上(19:00-22:00)
3. 高优先级任务安排在精力最佳的上午时段
4. 相似类型的任务尽量集中安排
5. 总工作时长不超过${availableHours}小时

请返回JSON格式的规划建议：
{
  "timeSlots": [
    {
      "period": "morning",
      "timeRange": "9:00-12:00", 
      "tasks": [
        {
          "taskIndex": 0,
          "estimatedDuration": 120,
          "startTime": "9:00",
          "endTime": "11:00",
          "reason": "高优先级任务，安排在精力最佳时段"
        }
      ]
    }
  ],
  "summary": {
    "totalTasks": 5,
    "scheduledTasks": 3,
    "totalTime": 480,
    "utilizationRate": 0.8
  }
}`;

        try {
            const response = await this.client.request('/v1/chat/completions', {
                model: this.client.model,
                messages: [
                    {
                        role: 'system',
                        content: '你是一个专业的时间管理助手，擅长为用户制定高效的时间规划。请严格按照JSON格式返回规划建议。'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 2000,
                temperature: 0.3
            });

            return this.parseScheduleResponse(response);
        } catch (error) {
            console.error('智能规划AI请求失败:', error);
            throw error;
        }
    }

    /**
     * 解析AI规划响应
     * 解析AI返回的时间规划JSON数据
     * @param {Object} response - AI API响应对象
     * @returns {Object} 解析后的规划数据
     */
    parseScheduleResponse(response) {
        try {
            let content = response.choices[0]?.message?.content || '';
            content = content.trim();
            
            // 清理响应文本，提取JSON部分
            const jsonStart = content.indexOf('{');
            const jsonEnd = content.lastIndexOf('}');
            
            if (jsonStart !== -1 && jsonEnd !== -1) {
                content = content.substring(jsonStart, jsonEnd + 1);
            }
            
            const parsedData = JSON.parse(content);
            
            // 验证和规范化数据结构
            if (!parsedData.timeSlots || !Array.isArray(parsedData.timeSlots)) {
                throw new Error('Invalid timeSlots structure');
            }
            
            // 确保每个时间段的数据完整性
            parsedData.timeSlots.forEach(slot => {
                if (!slot.period || !slot.timeRange || !Array.isArray(slot.tasks)) {
                    throw new Error('Invalid time slot structure');
                }
                
                // 确保任务数据完整性
                slot.tasks.forEach(task => {
                    if (typeof task.taskIndex === 'undefined' || !task.estimatedDuration) {
                        throw new Error('Invalid task structure in time slot');
                    }
                });
            });
            
            return parsedData;
        } catch (error) {
            console.error('解析AI规划响应失败:', error);
            
            // 返回默认的空规划结构
            return {
                timeSlots: [
                    {
                        period: 'morning',
                        timeRange: '9:00-12:00',
                        tasks: []
                    },
                    {
                        period: 'afternoon', 
                        timeRange: '14:00-18:00',
                        tasks: []
                    },
                    {
                        period: 'evening',
                        timeRange: '19:00-22:00',
                        tasks: []
                    }
                ],
                summary: {
                    totalTasks: 0,
                    scheduledTasks: 0,
                    totalTime: 0,
                    utilizationRate: 0
                }
            };
        }
    }
}

// ================================
// AI服务调用函数
// ================================

/**
 * 获取AI任务分类建议
 * 每次都重新生成AI分类建议，确保用户每次都能看到新的分析结果
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
        
        // 直接调用AI服务，不使用缓存
        // 智能分类功能每次都生成新的建议，保证用户体验
        const aiService = new AIService();
        const result = await aiService.classifyTask(text);
        
        console.log('AI分类结果:', result);
        return result;
    } catch (error) {
        console.error('AI分类失败:', error);
        return null;
    }
}

/**
 * 获取AI任务描述优化建议
 * 调用AI服务优化任务描述，每次都生成新的建议
 * @param {string} text - 原始任务描述文本
 * @returns {Promise<string|null>} 优化建议，失败时返回null
 */
async function getAIOptimization(text) {
    try {
        // 检查AI功能是否启用
        const config = AIConfigManager.getConfig();
        if (!config.enabled) {
            return null;
        }
        
        // 直接调用AI服务，不使用缓存
        const aiService = new AIService();
        const result = await aiService.optimizeTaskDescription(text);
        
        console.log('AI优化结果:', result);
        return result;
    } catch (error) {
        console.error('AI优化失败:', error);
        return null;
    }
}

/**
 * 获取AI智能时间规划
 * 调用AI服务生成当日时间安排建议
 * @param {Array} tasks - 今日任务列表
 * @param {Object} preferences - 用户偏好设置
 * @returns {Promise<Object|null>} 时间规划建议，失败时返回null
 */
async function getAISmartSchedule(tasks, preferences = {}) {
    try {
        // 检查AI功能是否启用
        const config = AIConfigManager.getConfig();
        if (!config.enabled) {
            return null;
        }
        
        // 过滤今日未完成的任务
        const todayTasks = tasks.filter(task => {
            if (task.completed) return false;
            
            const taskDate = new Date(task.dueDate);
            const today = new Date();
            return taskDate.toDateString() === today.toDateString();
        });
        
        if (todayTasks.length === 0) {
            console.log('今日没有待规划的任务');
            return null;
        }
        
        // 调用AI服务生成规划
        const aiService = new AIService();
        const result = await aiService.generateSmartSchedule(todayTasks, preferences);
        
        console.log('AI规划结果:', result);
        return result;
    } catch (error) {
        console.error('AI智能规划失败:', error);
        return null;
    }
}

// ================================
// AI分类相关UI函数
// ================================

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
 * 接受AI分类建议
 * 用户点击AI建议标签时调用，创建任务并使用AI建议的分类
 * @param {string} suggestedTag - AI建议的分类标签
 */
function acceptAISuggestion(suggestedTag) {
    // 检查是否有待创建的任务数据
    if (!pendingTodoData) {
        console.error('没有待创建的任务数据');
        return;
    }
    
    // 创建todo对象
    const todo = {
        text: pendingTodoData.text,
        completed: false,
        priority: pendingTodoData.priority,
        tag: suggestedTag,
        dueDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        aiEnhanced: pendingTodoData.aiEnhanced
    };
    
    // 添加到todos数组
    todos.push(todo);
    
    // 保存到localStorage
    localStorage.setItem('todos', JSON.stringify(todos));
    
    // 清空输入框并重置标签选择
    const todoInput = document.getElementById('todoInput');
    const tagSelect = document.getElementById('tagSelect');
    
    if (todoInput) {
        todoInput.value = '';
    }
    
    if (tagSelect && tagSelect.value === 'ai-classify') {
        // 重置为第一个普通标签
        const firstTag = currentLang === 'zh' ? '工作' : 'Work';
        tagSelect.value = firstTag;
    }
    
    // 清理待创建的任务数据
    pendingTodoData = null;
    
    // 隐藏建议区域
    hideAISuggestion();
    
    // 重新渲染
    renderTodos();
    
    // 显示成功提示
    showToast(currentLang === 'zh' ? '✅ 任务已创建' : '✅ Task created');
}

/**
 * 隐藏AI建议区域
 * 当用户忽略建议或已经接受建议时调用
 */
function hideAISuggestion() {
    const aiSuggestion = document.getElementById('aiSuggestion');
    aiSuggestion.style.display = 'none';
    
    // 如果用户忽略建议，清理待创建的任务数据
    if (pendingTodoData) {
        pendingTodoData = null;
        
        // 显示提示信息
        showToast(currentLang === 'zh' ? '❌ 已忽略AI建议' : '❌ AI suggestion ignored');
    }
}

// ================================
// AI优化相关UI函数
// ================================

/**
 * 显示任务优化弹窗
 * 展示原始描述和AI优化建议，让用户选择是否采用
 * @param {string} originalText - 原始任务描述
 * @param {string} optimizedText - AI优化后的描述
 */
function showOptimizeModal(originalText, optimizedText) {
    const modal = document.getElementById('optimizeModal');
    const originalTextElement = document.getElementById('originalText');
    const optimizedTextElement = document.getElementById('optimizedText');
    const loadingElement = document.getElementById('optimizeLoading');
    const editSection = document.getElementById('editSection');
    
    // 设置原始文本
    originalTextElement.textContent = originalText;
    
    // 如果有优化建议，显示它；否则显示加载状态
    if (optimizedText) {
        optimizedTextElement.textContent = optimizedText;
        optimizedTextElement.style.display = 'block';
        loadingElement.style.display = 'none';
    } else {
        optimizedTextElement.style.display = 'none';
        loadingElement.style.display = 'flex';
    }
    
    // 隐藏编辑区域
    editSection.style.display = 'none';
    
    // 重置按钮状态
    resetOptimizeButtons();
    
    // 显示弹窗
    modal.style.display = 'flex';
}

/**
 * 隐藏任务优化弹窗
 */
function hideOptimizeModal() {
    const modal = document.getElementById('optimizeModal');
    modal.style.display = 'none';
}

/**
 * 重置优化弹窗按钮状态
 */
function resetOptimizeButtons() {
    const acceptBtn = document.getElementById('acceptOptimize');
    const editBtn = document.getElementById('editOptimize');
    const ignoreBtn = document.getElementById('ignoreOptimize');
    const confirmEditBtn = document.getElementById('confirmEdit');
    const cancelEditBtn = document.getElementById('cancelEdit');
    
    // 显示主要按钮
    acceptBtn.style.display = 'inline-block';
    editBtn.style.display = 'inline-block';
    ignoreBtn.style.display = 'inline-block';
    
    // 隐藏编辑按钮
    confirmEditBtn.style.display = 'none';
    cancelEditBtn.style.display = 'none';
}

/**
 * 处理用户采用AI优化建议
 */
function acceptOptimization() {
    const optimizedText = document.getElementById('optimizedText').textContent;
    const todoInput = document.getElementById('todoInput');
    
    // 将优化后的文本设置到输入框
    todoInput.value = optimizedText;
    
    // 隐藏弹窗
    hideOptimizeModal();
    
    // 显示成功提示
    showToast('已采用AI优化建议');
}

// ================================
// 智能规划相关UI函数
// ================================

/**
 * 显示智能规划面板
 * 打开右侧智能规划面板并更新统计信息
 */
function showSmartPlanPanel() {
    const panel = document.getElementById('smartPlanPanel');
    if (!panel) {
        console.error('智能规划面板元素未找到');
        return;
    }
    
    panel.classList.add('open');
    
    // 更新统计信息
    updatePlanStats();
    
    // 检查是否有当日规划数据
    loadExistingSchedule();
}

/**
 * 隐藏智能规划面板
 * 关闭右侧智能规划面板
 */
function hideSmartPlanPanel() {
    const panel = document.getElementById('smartPlanPanel');
    if (!panel) {
        console.error('智能规划面板元素未找到');
        return;
    }
    panel.classList.remove('open');
}

/**
 * 更新规划统计信息
 * 计算并显示今日任务数、已规划任务数等统计数据
 */
function updatePlanStats() {
    // 检查todos变量是否存在
    if (typeof todos === 'undefined') {
        console.error('todos变量未定义');
        return;
    }
    
    const today = new Date().toDateString();
    const todayTasks = todos.filter(task => {
        if (task.completed) return false;
        const taskDate = new Date(task.dueDate);
        return taskDate.toDateString() === today;
    });
    
    const scheduledTasks = todayTasks.filter(task => 
        task.aiEnhanced && task.aiEnhanced.isScheduled
    );
    
    const totalEstimatedTime = scheduledTasks.reduce((total, task) => {
        return total + (task.aiEnhanced.estimatedDuration || 60);
    }, 0);
    
    // 更新DOM元素（添加null检查）
    const todayTaskCountEl = document.getElementById('todayTaskCount');
    const scheduledTaskCountEl = document.getElementById('scheduledTaskCount');
    const totalEstimatedTimeEl = document.getElementById('totalEstimatedTime');
    
    if (todayTaskCountEl) todayTaskCountEl.textContent = todayTasks.length;
    if (scheduledTaskCountEl) scheduledTaskCountEl.textContent = scheduledTasks.length;
    if (totalEstimatedTimeEl) totalEstimatedTimeEl.textContent = `${Math.round(totalEstimatedTime / 60)}h`;
}

/**
 * 生成智能规划
 * 调用AI生成时间规划并显示在面板中
 */
async function generateSmartPlan() {
    const generateBtn = document.getElementById('generatePlanBtn');
    const refreshBtn = document.getElementById('refreshPlanBtn');
    
    if (!generateBtn) {
        console.error('生成规划按钮未找到');
        return;
    }
    
    // 显示加载状态
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">AI规划中...</span>';
    
    try {
        // 检查AI配置
        const aiConfig = AIConfigManager.getConfig();
        if (!aiConfig.enabled) {
            showToast(currentLang === 'zh' ? '❌ AI功能未启用' : '❌ AI feature not enabled');
            return;
        }
        
        if (!aiConfig.apiConfig.apiKey) {
            showToast(currentLang === 'zh' ? '❌ 请先配置AI服务密钥' : '❌ Please configure AI service key first');
            // 自动打开配置弹窗
            showAIConfigModal();
            return;
        }
        
        // 检查todos变量是否存在
        if (typeof todos === 'undefined') {
            console.error('todos变量未定义');
            showToast(currentLang === 'zh' ? '❌ 数据未加载' : '❌ Data not loaded');
            return;
        }
        
        // 获取今日任务
        const today = new Date().toDateString();
        const todayTasks = todos.filter(task => {
            if (task.completed) return false;
            const taskDate = new Date(task.dueDate);
            return taskDate.toDateString() === today;
        });
        
        if (todayTasks.length === 0) {
            showToast(currentLang === 'zh' ? '❌ 今日没有待规划的任务' : '❌ No tasks to schedule for today');
            return;
        }
        
        // 调用AI生成规划
        const schedule = await getAISmartSchedule(todayTasks);
        
        if (schedule) {
            // 保存规划到localStorage
            saveSmartSchedule(schedule, todayTasks);
            
            // 渲染规划结果
            renderSmartSchedule(schedule, todos);
            
            // 切换按钮状态
            generateBtn.style.display = 'none';
            if (refreshBtn) {
                refreshBtn.style.display = 'block';
            }
            
            showToast(currentLang === 'zh' ? '✅ 智能规划生成成功' : '✅ Smart schedule generated');
        } else {
            showToast(currentLang === 'zh' ? '❌ 规划生成失败，请稍后重试' : '❌ Failed to generate schedule');
        }
    } catch (error) {
        console.error('生成智能规划失败:', error);
        
        // 根据错误类型提供更具体的错误信息
        if (error.message.includes('API密钥未配置')) {
            showToast(currentLang === 'zh' ? '❌ 请先配置AI服务密钥' : '❌ Please configure AI service key first');
            showAIConfigModal();
        } else if (error.message.includes('API请求失败')) {
            showToast(currentLang === 'zh' ? '❌ AI服务暂时不可用，请稍后重试' : '❌ AI service temporarily unavailable');
        } else {
            showToast(currentLang === 'zh' ? '❌ 规划生成失败，请检查网络连接' : '❌ Failed to generate schedule, please check network');
        }
    } finally {
        // 恢复按钮状态
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<span class="btn-icon">🤖</span><span class="btn-text">生成智能规划</span>';
    }
}

/**
 * 渲染智能规划结果
 * 在面板中显示AI生成的时间安排
 * @param {Object} schedule - AI生成的规划数据
 * @param {Array} tasks - 任务列表
 */
function renderSmartSchedule(schedule, tasks) {
    // 清空现有内容
    document.getElementById('morningTasks').innerHTML = '';
    document.getElementById('afternoonTasks').innerHTML = '';
    document.getElementById('eveningTasks').innerHTML = '';
    document.getElementById('unscheduledTasks').innerHTML = '';
    
    const scheduledTaskIndexes = new Set();
    
    // 渲染每个时间段的任务
    schedule.timeSlots.forEach(slot => {
        const container = document.getElementById(getTimeSlotContainerId(slot.period));
        if (!container) return;
        
        slot.tasks.forEach(scheduledTask => {
            const task = todos[scheduledTask.taskIndex]; // 使用最新的todos数据
            if (!task) return;
            
            scheduledTaskIndexes.add(scheduledTask.taskIndex);
            
            const taskCard = createPlanTaskCard(task, scheduledTask, slot.period);
            container.appendChild(taskCard);
        });
    });
    
    // 渲染未规划的任务（基于当前todos和调度状态）
    const today = new Date().toDateString();
    todos.forEach((task, index) => {
        // 只显示今日未完成且未调度的任务
        if (task.completed) return;
        
        const taskDate = new Date(task.dueDate);
        if (taskDate.toDateString() !== today) return;
        
        // 检查任务是否已在规划中
        const isScheduled = scheduledTaskIndexes.has(index) || 
                           (task.aiEnhanced && task.aiEnhanced.isScheduled);
        
        if (!isScheduled) {
            const unscheduledContainer = document.getElementById('unscheduledTasks');
            const taskItem = createUnscheduledTaskItem(task, index);
            unscheduledContainer.appendChild(taskItem);
        }
    });
    
    // 更新统计信息
    updatePlanStats();
}

/**
 * 创建任务卡片元素
 * @param {Object} task - 任务对象
 * @param {Object} scheduledTask - 规划任务信息
 * @param {string} period - 时间段
 * @returns {HTMLElement} 任务卡片元素
 */
function createPlanTaskCard(task, scheduledTask, period) {
    const card = document.createElement('div');
    card.className = 'plan-task-card';
    card.draggable = true;
    card.dataset.taskIndex = scheduledTask.taskIndex;
    card.dataset.period = period;
    
    const priorityClass = task.priority || 'medium';
    const priorityText = currentLang === 'zh' ? 
        { high: '高', medium: '中', low: '低' }[priorityClass] :
        { high: 'High', medium: 'Med', low: 'Low' }[priorityClass];
    
    // 检查任务是否已确认
    const isConfirmed = task.aiEnhanced && task.aiEnhanced.scheduleAccepted;
    
    // 根据确认状态显示不同的操作按钮
    const actionsHTML = isConfirmed ? 
        `<span class="plan-task-confirmed" title="${currentLang === 'zh' ? '已确认安排' : 'Schedule confirmed'}">✓ ${currentLang === 'zh' ? '已确认' : 'Confirmed'}</span>` :
        `<button class="plan-task-btn confirm" onclick="confirmTaskSchedule(${scheduledTask.taskIndex})" title="${currentLang === 'zh' ? '确认安排' : 'Confirm schedule'}">✓</button>
         <button class="plan-task-btn remove" onclick="removeTaskFromSchedule(${scheduledTask.taskIndex})" title="${currentLang === 'zh' ? '移除' : 'Remove'}">×</button>`;
    
    card.innerHTML = `
        <div class="plan-task-content">
            <span class="plan-task-name" title="${task.text}">${task.text}</span>
            <span class="plan-task-priority ${priorityClass}">${priorityText}</span>
        </div>
        <div class="plan-task-meta">
            <span class="plan-task-duration">${Math.round(scheduledTask.estimatedDuration / 60)}h</span>
            <div class="plan-task-actions">
                ${actionsHTML}
            </div>
        </div>
    `;
    
    // 如果已确认，添加确认样式并禁用拖拽
    if (isConfirmed) {
        card.classList.add('confirmed');
        card.draggable = false;
    } else {
        // 添加拖拽事件
        setupTaskCardDragEvents(card);
    }
    
    return card;
}

/**
 * 创建未规划任务项
 * @param {Object} task - 任务对象
 * @param {number} index - 任务索引
 * @returns {HTMLElement} 未规划任务元素
 */
function createUnscheduledTaskItem(task, index) {
    const item = document.createElement('div');
    item.className = 'unscheduled-task-item';
    item.draggable = true;
    item.dataset.taskIndex = index;
    
    const priorityClass = task.priority || 'medium';
    const priorityText = currentLang === 'zh' ? 
        { high: '高', medium: '中', low: '低' }[priorityClass] :
        { high: 'High', medium: 'Med', low: 'Low' }[priorityClass];
    
    item.innerHTML = `
        <span class="unscheduled-task-name" title="${task.text}">${task.text}</span>
        <span class="unscheduled-task-priority ${priorityClass}">${priorityText}</span>
    `;
    
    // 添加拖拽事件
    setupTaskItemDragEvents(item);
    
    return item;
}

/**
 * 获取时间段容器ID
 * @param {string} period - 时间段标识
 * @returns {string} 容器元素ID
 */
function getTimeSlotContainerId(period) {
    const mapping = {
        'morning': 'morningTasks',
        'afternoon': 'afternoonTasks',
        'evening': 'eveningTasks'
    };
    return mapping[period] || 'unscheduledTasks';
}

/**
 * 保存智能规划到localStorage
 * @param {Object} schedule - 规划数据
 * @param {Array} tasks - 任务列表
 */
function saveSmartSchedule(schedule, tasks) {
    const today = new Date().toISOString().split('T')[0];
    const smartSchedule = {
        date: today,
        generated: new Date().toISOString(),
        version: 1,
        schedule: schedule,
        tasks: tasks.map((task, index) => ({ ...task, originalIndex: index }))
    };
    
    localStorage.setItem('smartSchedule', JSON.stringify(smartSchedule));
}

/**
 * 加载现有规划数据
 * 检查是否有当日的规划数据并加载
 */
function loadExistingSchedule() {
    const savedSchedule = localStorage.getItem('smartSchedule');
    if (!savedSchedule) return;
    
    try {
        const scheduleData = JSON.parse(savedSchedule);
        const today = new Date().toISOString().split('T')[0];
        
        // 检查是否是今日的规划
        if (scheduleData.date === today) {
            renderSmartSchedule(scheduleData.schedule, todos);
            
            // 显示重新规划按钮
            document.getElementById('generatePlanBtn').style.display = 'none';
            document.getElementById('refreshPlanBtn').style.display = 'block';
        }
    } catch (error) {
        console.error('加载规划数据失败:', error);
    }
}

/**
 * 进入编辑模式
 */
function enterEditMode() {
    const optimizedText = document.getElementById('optimizedText').textContent;
    const editSection = document.getElementById('editSection');
    const editTextarea = document.getElementById('editTextarea');
    const acceptBtn = document.getElementById('acceptOptimize');
    const editBtn = document.getElementById('editOptimize');
    const ignoreBtn = document.getElementById('ignoreOptimize');
    const confirmEditBtn = document.getElementById('confirmEdit');
    const cancelEditBtn = document.getElementById('cancelEdit');
    
    // 显示编辑区域
    editSection.style.display = 'block';
    editTextarea.value = optimizedText;
    editTextarea.focus();
    
    // 切换按钮状态
    acceptBtn.style.display = 'none';
    editBtn.style.display = 'none';
    ignoreBtn.style.display = 'none';
    confirmEditBtn.style.display = 'inline-block';
    cancelEditBtn.style.display = 'inline-block';
}

/**
 * 确认编辑
 */
function confirmEdit() {
    const editTextarea = document.getElementById('editTextarea');
    const todoInput = document.getElementById('todoInput');
    
    // 将编辑后的文本设置到输入框
    todoInput.value = editTextarea.value.trim();
    
    // 隐藏弹窗
    hideOptimizeModal();
    
    // 显示成功提示
    showToast('已保存编辑内容');
}

/**
 * 取消编辑
 */
function cancelEdit() {
    const editSection = document.getElementById('editSection');
    
    // 隐藏编辑区域
    editSection.style.display = 'none';
    
    // 重置按钮状态
    resetOptimizeButtons();
}

/**
 * 忽略优化建议
 */
function ignoreOptimization() {
    // 直接隐藏弹窗
    hideOptimizeModal();
    
    // 显示提示
    showToast('已忽略AI建议');
}

/**
 * 处理优化按钮点击事件
 * 点击优化按钮时触发，检查输入内容并调用AI优化功能
 */
async function handleOptimizeClick() {
    const todoInput = document.getElementById('todoInput');
    const optimizeBtn = document.getElementById('optimizeBtn');
    const originalText = todoInput.value.trim();
    
    // 检查输入是否为空
    if (!originalText) {
        showToast('请先输入任务描述');
        return;
    }
    
    // 检查AI功能是否启用
    const config = AIConfigManager.getConfig();
    if (!config.enabled) {
        showToast('AI功能未启用，请先配置AI服务');
        return;
    }
    
    // 显示加载状态
    optimizeBtn.disabled = true;
    const iconElement = optimizeBtn.querySelector('.optimize-icon');
    const textElement = optimizeBtn.querySelector('.optimize-text');
    if (iconElement) iconElement.textContent = '⏳';
    if (textElement) textElement.textContent = translations[currentLang].optimize.processing;
    
    try {
        // 先显示弹窗（显示加载状态）
        showOptimizeModal(originalText, null);
        
        // 获取AI优化建议
        const optimizedText = await getAIOptimization(originalText);
        
        if (optimizedText) {
            // 更新弹窗内容
            const optimizedTextElement = document.getElementById('optimizedText');
            const loadingElement = document.getElementById('optimizeLoading');
            
            optimizedTextElement.textContent = optimizedText;
            optimizedTextElement.style.display = 'block';
            loadingElement.style.display = 'none';
        } else {
            // 优化失败
            hideOptimizeModal();
            showToast('AI优化失败，请检查网络连接或API配置');
        }
    } catch (error) {
        console.error('优化过程出错:', error);
        hideOptimizeModal();
        showToast('优化过程出现错误，请稍后再试');
    } finally {
        // 恢复按钮状态
        optimizeBtn.disabled = false;
        const iconElement = optimizeBtn.querySelector('.optimize-icon');
        const textElement = optimizeBtn.querySelector('.optimize-text');
        if (iconElement) iconElement.textContent = '✨';
        if (textElement) textElement.textContent = translations[currentLang].optimize.button;
    }
}

// ================================
// AI配置相关UI函数
// ================================

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

// ================================
// AI事件监听器设置
// ================================

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
            // 如果用户手动选择了其他标签，隐藏AI建议并清理待创建的任务
            if (e.target.value !== 'ai-classify') {
                hideAISuggestion();
            }
        });
    }
    
    // 监听输入框变化，当用户修改输入时隐藏AI建议并清理待创建的任务
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
    
    // ==============================
    // 任务优化功能事件监听器
    // ==============================
    
    // 优化按钮点击事件
    const optimizeBtn = document.getElementById('optimizeBtn');
    if (optimizeBtn) {
        optimizeBtn.addEventListener('click', handleOptimizeClick);
    }
    
    // 优化弹窗相关事件
    const optimizeModal = document.getElementById('optimizeModal');
    const acceptOptimizeBtn = document.getElementById('acceptOptimize');
    const editOptimizeBtn = document.getElementById('editOptimize');
    const ignoreOptimizeBtn = document.getElementById('ignoreOptimize');
    const confirmEditBtn = document.getElementById('confirmEdit');
    const cancelEditBtn = document.getElementById('cancelEdit');
    
    if (acceptOptimizeBtn) {
        acceptOptimizeBtn.addEventListener('click', acceptOptimization);
    }
    
    if (editOptimizeBtn) {
        editOptimizeBtn.addEventListener('click', enterEditMode);
    }
    
    if (ignoreOptimizeBtn) {
        ignoreOptimizeBtn.addEventListener('click', ignoreOptimization);
    }
    
    if (confirmEditBtn) {
        confirmEditBtn.addEventListener('click', confirmEdit);
    }
    
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', cancelEdit);
    }
    
    // 点击弹窗外部关闭优化弹窗
    if (optimizeModal) {
        optimizeModal.addEventListener('click', (e) => {
            if (e.target === optimizeModal) {
                hideOptimizeModal();
            }
        });
    }
    
    // ESC键关闭优化弹窗
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && optimizeModal && optimizeModal.style.display === 'flex') {
            hideOptimizeModal();
        }
    });
    
    // ==============================
    // 智能规划功能事件监听器
    // ==============================
    
    // 智能规划按钮点击事件
    const smartPlanToggle = document.getElementById('smartPlanToggle');
    if (smartPlanToggle) {
        smartPlanToggle.addEventListener('click', showSmartPlanPanel);
    }
    
    // 智能规划面板关闭按钮
    const closePlanPanel = document.getElementById('closePlanPanel');
    if (closePlanPanel) {
        closePlanPanel.addEventListener('click', hideSmartPlanPanel);
    }
    
    // 生成规划按钮
    const generatePlanBtn = document.getElementById('generatePlanBtn');
    if (generatePlanBtn) {
        generatePlanBtn.addEventListener('click', generateSmartPlan);
    }
    
    // 重新规划按钮
    const refreshPlanBtn = document.getElementById('refreshPlanBtn');
    if (refreshPlanBtn) {
        refreshPlanBtn.addEventListener('click', () => {
            // 清除所有任务的调度状态
            clearAllScheduleStatus();
            
            // 重置按钮状态
            generatePlanBtn.style.display = 'block';
            refreshPlanBtn.style.display = 'none';
            
            // 重新生成规划
            generateSmartPlan();
        });
    }
    
    // 设置时间段拖拽区域
    setupTimeSlotDropZones();
}

// ================================
// 智能规划拖拽功能
// ================================

/**
 * 设置任务卡片拖拽事件
 * @param {HTMLElement} card - 任务卡片元素
 */
function setupTaskCardDragEvents(card) {
    card.addEventListener('dragstart', (e) => {
        card.classList.add('dragging');
        e.dataTransfer.setData('text/plain', card.dataset.taskIndex);
        e.dataTransfer.setData('source', 'scheduled');
        e.dataTransfer.setData('sourcePeriod', card.dataset.period);
    });
    
    card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
    });
}

/**
 * 设置未规划任务项拖拽事件
 * @param {HTMLElement} item - 任务项元素
 */
function setupTaskItemDragEvents(item) {
    item.addEventListener('dragstart', (e) => {
        item.classList.add('dragging');
        e.dataTransfer.setData('text/plain', item.dataset.taskIndex);
        e.dataTransfer.setData('source', 'unscheduled');
    });
    
    item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
    });
}

/**
 * 设置时间段拖拽区域
 */
function setupTimeSlotDropZones() {
    const timeSlots = ['morningTasks', 'afternoonTasks', 'eveningTasks', 'unscheduledTasks'];
    
    timeSlots.forEach(slotId => {
        const slot = document.getElementById(slotId);
        if (!slot) return;
        
        slot.addEventListener('dragover', (e) => {
            e.preventDefault();
            slot.classList.add('drag-over');
        });
        
        slot.addEventListener('dragleave', (e) => {
            if (!slot.contains(e.relatedTarget)) {
                slot.classList.remove('drag-over');
            }
        });
        
        slot.addEventListener('drop', (e) => {
            e.preventDefault();
            slot.classList.remove('drag-over');
            
            const taskIndex = e.dataTransfer.getData('text/plain');
            const source = e.dataTransfer.getData('source');
            const sourcePeriod = e.dataTransfer.getData('sourcePeriod');
            const targetPeriod = slot.dataset.period || 'unscheduled';
            
            handleTaskDrop(taskIndex, source, sourcePeriod, targetPeriod);
        });
    });
}

/**
 * 处理任务拖拽放置
 * @param {string} taskIndex - 任务索引
 * @param {string} source - 拖拽源
 * @param {string} sourcePeriod - 源时间段
 * @param {string} targetPeriod - 目标时间段
 */
function handleTaskDrop(taskIndex, source, sourcePeriod, targetPeriod) {
    console.log(`移动任务 ${taskIndex} 从 ${sourcePeriod || source} 到 ${targetPeriod}`);
    
    // 如果目标时间段和源时间段相同，不需要处理
    if ((sourcePeriod && sourcePeriod === targetPeriod) || (source === 'unscheduled' && targetPeriod === 'unscheduled')) {
        return;
    }
    
    // 获取当前规划数据
    const savedSchedule = localStorage.getItem('smartSchedule');
    if (!savedSchedule) {
        console.error('未找到规划数据');
        return;
    }
    
    try {
        const scheduleData = JSON.parse(savedSchedule);
        const schedule = scheduleData.schedule;
        const taskIndexInt = parseInt(taskIndex);
        
        // 从原时间段移除任务（只有当源是已调度的时间段时才需要）
        if (sourcePeriod && sourcePeriod !== 'unscheduled') {
            const sourceSlot = schedule.timeSlots.find(slot => slot.period === sourcePeriod);
            if (sourceSlot) {
                sourceSlot.tasks = sourceSlot.tasks.filter(task => task.taskIndex !== taskIndexInt);
            }
        }
        
        // 添加到新时间段（如果目标不是未规划区域）
        if (targetPeriod !== 'unscheduled') {
            const targetSlot = schedule.timeSlots.find(slot => slot.period === targetPeriod);
            if (targetSlot) {
                // 检查任务是否已经在目标时间段中（避免重复添加）
                const existingTask = targetSlot.tasks.find(task => task.taskIndex === taskIndexInt);
                if (!existingTask) {
                    // 创建新的任务对象
                    const taskToMove = {
                        taskIndex: taskIndexInt,
                        estimatedDuration: 60, // 默认60分钟
                        reason: `用户移动到${getPeriodName(targetPeriod)}`
                    };
                    targetSlot.tasks.push(taskToMove);
                }
            }
        }
        
        // 更新任务的AI增强信息
        if (todos[taskIndexInt]) {
            if (!todos[taskIndexInt].aiEnhanced) {
                todos[taskIndexInt].aiEnhanced = {};
            }
            todos[taskIndexInt].aiEnhanced.isScheduled = targetPeriod !== 'unscheduled';
            todos[taskIndexInt].aiEnhanced.scheduleAccepted = false; // 重新调度时重置确认状态
            
            // 保存任务数据
            localStorage.setItem('todos', JSON.stringify(todos));
        }
        
        // 保存更新后的规划数据
        localStorage.setItem('smartSchedule', JSON.stringify(scheduleData));
        
        // 使用当前的todos数组重新渲染（而不是savedSchedule中的旧任务数据）
        renderSmartSchedule(schedule, todos);
        
        // 重新渲染任务列表（更新⏰图标）
        renderTodos();
        
        // 更新统计信息
        updatePlanStats();
        
        showToast(currentLang === 'zh' ? 
            `✅ 任务已移动到${getPeriodName(targetPeriod)}` : 
            `✅ Task moved to ${getPeriodName(targetPeriod)}`
        );
        
    } catch (error) {
        console.error('移动任务失败:', error);
        showToast(currentLang === 'zh' ? '❌ 移动任务失败' : '❌ Failed to move task');
    }
}

/**
 * 获取时间段名称
 * @param {string} period - 时间段标识
 * @returns {string} 时间段名称
 */
function getPeriodName(period) {
    const names = {
        'morning': currentLang === 'zh' ? '上午' : 'Morning',
        'afternoon': currentLang === 'zh' ? '下午' : 'Afternoon', 
        'evening': currentLang === 'zh' ? '晚上' : 'Evening',
        'unscheduled': currentLang === 'zh' ? '未规划' : 'Unscheduled'
    };
    return names[period] || period;
}

/**
 * 刷新智能规划面板
 * 根据当前任务状态重新渲染智能规划面板
 */
function refreshSmartPlanPanel() {
    // 获取当前规划数据
    const savedSchedule = localStorage.getItem('smartSchedule');
    if (!savedSchedule) {
        return;
    }
    
    try {
        const scheduleData = JSON.parse(savedSchedule);
        const schedule = scheduleData.schedule;
        
        // 过滤掉被移除的任务（isScheduled为false的任务）
        schedule.timeSlots.forEach(slot => {
            slot.tasks = slot.tasks.filter(task => {
                const todoTask = todos[task.taskIndex];
                return todoTask && todoTask.aiEnhanced && todoTask.aiEnhanced.isScheduled;
            });
        });
        
        // 更新并保存规划数据
        localStorage.setItem('smartSchedule', JSON.stringify(scheduleData));
        
        // 重新渲染面板（现在renderSmartSchedule会自动使用最新的todos数据）
        renderSmartSchedule(schedule, todos);
        
        // 更新统计信息
        updatePlanStats();
        
    } catch (error) {
        console.error('刷新智能规划面板失败:', error);
    }
}

/**
 * 清除所有任务的调度状态
 * 在重新规划时调用，清除所有任务的⏰图标和调度状态
 */
function clearAllScheduleStatus() {
    // 清除所有任务的调度状态
    todos.forEach(todo => {
        if (todo.aiEnhanced) {
            todo.aiEnhanced.isScheduled = false;
            todo.aiEnhanced.scheduleAccepted = false;
        }
    });
    
    // 保存更新后的任务数据
    localStorage.setItem('todos', JSON.stringify(todos));
    
    // 清除规划数据
    localStorage.removeItem('smartSchedule');
    
    // 重新渲染任务列表（移除所有⏰图标）
    renderTodos();
    
    showToast(currentLang === 'zh' ? '✅ 已清除所有时间安排' : '✅ All schedules cleared');
}

/**
 * 确认任务安排
 * @param {number} taskIndex - 任务索引
 */
function confirmTaskSchedule(taskIndex) {
    console.log(`确认任务 ${taskIndex} 的时间安排`);
    
    // 更新任务的AI增强信息
    if (todos[taskIndex]) {
        if (!todos[taskIndex].aiEnhanced) {
            todos[taskIndex].aiEnhanced = {};
        }
        todos[taskIndex].aiEnhanced.isScheduled = true;
        todos[taskIndex].aiEnhanced.scheduleAccepted = true;
        
        // 保存到localStorage
        localStorage.setItem('todos', JSON.stringify(todos));
        
        // 重新渲染任务列表（显示⏰图标）
        renderTodos();
        
        // 重新渲染智能规划面板（更新按钮状态为已确认）
        refreshSmartPlanPanel();
        
        // 更新统计信息
        updatePlanStats();
        
        showToast(currentLang === 'zh' ? '✅ 已确认时间安排' : '✅ Schedule confirmed');
    }
}

/**
 * 从规划中移除任务
 * @param {number} taskIndex - 任务索引
 */
function removeTaskFromSchedule(taskIndex) {
    console.log(`从规划中移除任务 ${taskIndex}`);
    
    // 更新任务的AI增强信息
    if (todos[taskIndex]) {
        if (!todos[taskIndex].aiEnhanced) {
            todos[taskIndex].aiEnhanced = {};
        }
        todos[taskIndex].aiEnhanced.isScheduled = false;
        todos[taskIndex].aiEnhanced.scheduleAccepted = false;
        
        // 保存到localStorage
        localStorage.setItem('todos', JSON.stringify(todos));
        
        // 重新渲染任务列表（移除⏰图标）
        renderTodos();
        
        // 重新渲染智能规划面板
        refreshSmartPlanPanel();
        
        showToast(currentLang === 'zh' ? '✅ 已移除时间安排' : '✅ Removed from schedule');
    }
} 