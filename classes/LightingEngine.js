global.STDVector = function(cls, len, base) {
  if (base && 'memoryBuffer' in base) {
    return [...Array(len)].map(()=>{let res = new cls(); res.memoryBuffer = base.memoryBuffer; return res;})
  }
  return [...Array(len)].map(()=> new cls());
}

function toRadians(angle) {
  return Math.PI / 180 * angle;
}

const fs = require('fs');
const nvk = require('nvk');
const {vec2, ivec2, vec3, vec4, quat, mat4, cvec, UniformBufferObject} = require('./VLightingMath.js');
Object.assign(global, nvk);



const validationLayers = [
  // "VK_LAYER_KHRONOS_validation"
];

const enableValidationLayers = true;

const WORKGROUP_SIZE = 32;

class LightingEngine {
  constructor(){
    this.dependantsInitialised = false;
    this.deviceExtensions = new Set([]);
    this.cleanup = this.cleanup.bind(this);
    this.performance = new Map();
    this.addPerformanceGroup('total');
    this.addPerformanceGroup('resize');
    this.addPerformanceGroup('memoryMap');
    this.addPerformanceGroup('runCommand');
    this.addPerformanceGroup('copyBuf');
    this.addPerformanceGroup('getImage');
    this.init();
  }

  init() {
    this.initVulkan();
    process.on('exit', this.cleanup);
    // process.on('uncaughtException', e=>console.log(e));
    // process.on('beforeExit', this.keepRunning)
  }

  setupDebugMessenger(){
    this.debugMessenger = new VkDebugUtilsMessengerEXT();
    if (!enableValidationLayers) return;
    let createInfo = new VkDebugUtilsMessengerCreateInfoEXT();
    createInfo.messageSeverity = VK_DEBUG_UTILS_MESSAGE_SEVERITY_VERBOSE_BIT_EXT | VK_DEBUG_UTILS_MESSAGE_SEVERITY_WARNING_BIT_EXT | VK_DEBUG_UTILS_MESSAGE_SEVERITY_ERROR_BIT_EXT;
    createInfo.messageType = VK_DEBUG_UTILS_MESSAGE_TYPE_GENERAL_BIT_EXT | VK_DEBUG_UTILS_MESSAGE_TYPE_VALIDATION_BIT_EXT | VK_DEBUG_UTILS_MESSAGE_TYPE_PERFORMANCE_BIT_EXT;
    createInfo.pfnUserCallback = LightingEngine.debugCallback;
    if (vkCreateDebugUtilsMessengerEXT(this.instance, createInfo, null, this.debugMessenger) != VK_SUCCESS) {
      throw new Error("Failed to add debug callback.");
    }
  }

  initVulkan() {
    this.createInstance();
    this.setupDebugMessenger();
    this.pickPhysicalDevice();
    this.createLogicalDevice();
    this.createUniformBuffer();
    this.createCommandPool()
    console.log("createDescriptorSetLayout");
    this.createDescriptorSetLayout();
    console.log("createComputePipeline");
    this.createComputePipeline();
    console.log("createDescriptorPool");
    this.createDescriptorPool();

  }

  checkValidationLayerSupport(){
    let layerCount = {$: 0};
    vkEnumerateInstanceLayerProperties(layerCount, null);
    let availableLayers = STDVector(VkLayerProperties, layerCount.$);
    vkEnumerateInstanceLayerProperties(layerCount, availableLayers);

    for (let layer of validationLayers) {
      let found = false;
      for (let testLayer of availableLayers) {
        if (testLayer.layerName == layer) {
          found = true;
          break;
        }
      }
      if (!found) return false;
    }
    return true;
  }

  getRequiredExtensions(){
    // let res = this.win.getRequiredInstanceExtensions();
    let res = [];
    if (enableValidationLayers) res.push(VK_EXT_DEBUG_UTILS_EXTENSION_NAME);
    return res;
  }

  static debugCallback(messageSeverity, messageType, callbackData, userData) {
    console.log("validation layer: " + callbackData.pMessage);
    return false;
  }

  createInstance(){
    if (enableValidationLayers && !this.checkValidationLayerSupport()) {
      throw new Error("Missing validation layers!");
    }
    this.appInfo = new VkApplicationInfo();
    this.appInfo.pApplicationName = "util-tests lighting engine";
    this.appInfo.pApplicationVersion = VK_MAKE_VERSION(1,0,0);
    this.appInfo.pEngineName = "No Engine";
    this.appInfo.engineVersion = VK_MAKE_VERSION(1,0,0);
    this.appInfo.apiVersion = VK_API_VERSION_1_0;
    let createInfo = new VkInstanceCreateInfo();
    createInfo.pApplicationInfo = this.appInfo;
    let instanceExtensions = this.getRequiredExtensions();
    createInfo.enabledExtensionCount = instanceExtensions.length;
    createInfo.ppEnabledExtensionNames = instanceExtensions;
    if (enableValidationLayers) {
      createInfo.enabledLayerCount = validationLayers.length;
      createInfo.ppEnabledLayerNames = validationLayers;
    } else createInfo.enabledLayerCount = 0;

    this.instance = new VkInstance();

    if (vkCreateInstance(createInfo, null, this.instance) !== VK_SUCCESS) {
      throw new Error("Failed to create instance.")
    }
  }

  isDeviceSuitable(device) {
    //Compute shaders have no special requirements as Vulkan has mandatory support in devices.
    return true;
  }

  checkDeviceExtensionSupport(device){
    let extensionCount = {$: 0};
    vkEnumerateDeviceExtensionProperties(device, null, extensionCount, null);

    let availableExtensions = STDVector(VkExtensionProperties, extensionCount.$);
    vkEnumerateDeviceExtensionProperties(device, null, extensionCount, availableExtensions);

    let requiredExtensions = new Set(this.deviceExtensions);
    for (let extension of availableExtensions) {
      requiredExtensions.delete(extension.extensionName);
    }
    return requiredExtensions.size <= 0;
  }

  findQueueFamilies(device) {
    let indices = new QueueFamilyIndices();

    let queueFamilyCount = {$:0};
    vkGetPhysicalDeviceQueueFamilyProperties(device, queueFamilyCount, null);

    let queueFamilies = STDVector(VkQueueFamilyProperties, queueFamilyCount.$);
    vkGetPhysicalDeviceQueueFamilyProperties(device, queueFamilyCount, queueFamilies);

    let i = 0;
    for (let queueFamily of queueFamilies) {
      if (queueFamily.queueFlags & VK_QUEUE_COMPUTE_BIT) {
        indices.computeFamily = i;
      }
      if (indices.isComplete()) break;
      i ++;
    }

    return indices;
  }

  querySwapChainSupport(device){
    let details = new SwapChainSupportDetails();

    vkGetPhysicalDeviceSurfaceCapabilitiesKHR(device, this.surface, details.capabilities);
    //
    let surfaceFormatCount = {$: 0};
    vkGetPhysicalDeviceSurfaceFormatsKHR(device, this.surface, surfaceFormatCount, null);
    if (surfaceFormatCount.$ > 0) {
      details.formats = STDVector(VkSurfaceFormatKHR, surfaceFormatCount.$);
      vkGetPhysicalDeviceSurfaceFormatsKHR(device, this.surface, surfaceFormatCount, details.formats);
    }


    let presentModeCount = {$: 0};
    vkGetPhysicalDeviceSurfacePresentModesKHR(device, this.surface, presentModeCount, null);
    if (presentModeCount.$ > 0) {
      details.presentModes = new Int32Array(presentModeCount.$);
      vkGetPhysicalDeviceSurfacePresentModesKHR(device, this.surface, presentModeCount, details.presentModes);

    }

    return details;
  }

  pickPhysicalDevice(){
    this.physicalDevice = VK_NULL_HANDLE;

    //Get a list of physical devices on the system.
    let deviceCount = {$:0};
    vkEnumeratePhysicalDevices(this.instance, deviceCount, null);
    if (deviceCount.$ <= 0 ) throw new Error("No render devices are available.");
    let devices = STDVector(VkPhysicalDevice, deviceCount.$);
    if (vkEnumeratePhysicalDevices(this.instance, deviceCount, devices) != VK_SUCCESS){
      throw new Error("Failed to enumerate physical devices.")
    }
    for (let device of devices) {
      if (this.isDeviceSuitable(device)) {
        this.physicalDevice = device;
        break;
      }
    }

    if (this.physicalDevice == VK_NULL_HANDLE) {
      throw new Error("Failed to find a suitable GPU.")
    }

  }

  createLogicalDevice(){
    this.device = new VkDevice();
    this.indices = this.findQueueFamilies(this.physicalDevice);

    let queueCreateInfos = [];
    let uniqueQueueFamilies = new Set([this.indices.computeFamily]);

    for (let queueFamily of uniqueQueueFamilies) {
      console.log("Queue family " + queueFamily);
      let queueCreateInfo = new VkDeviceQueueCreateInfo();
      queueCreateInfo.queueFamilyIndex = queueFamily;
      queueCreateInfo.queueCount = 1;
      queueCreateInfo.pQueuePriorities = new Float32Array([1.0]);
      queueCreateInfos.push(queueCreateInfo);
    }



    let deviceFeatures = new VkPhysicalDeviceFeatures();

    let createInfo = new VkDeviceCreateInfo();
    createInfo.queueCreateInfoCount = queueCreateInfos.length;
    createInfo.pQueueCreateInfos = queueCreateInfos;
    createInfo.pEnabledFeatures = deviceFeatures;
    createInfo.enabledExtensionCount = this.deviceExtensions.size;
    createInfo.ppEnabledExtensionNames = Array.from(this.deviceExtensions);
    createInfo.enabledLayerCount = 0;
    if (vkCreateDevice(this.physicalDevice, createInfo, null, this.device) != VK_SUCCESS) {
      throw new Error("Failed to create logical device.");
    }

    this.computeQueue = new VkQueue();
    vkGetDeviceQueue(this.device, this.indices.computeFamily, 0, this.computeQueue);

  }

  createDescriptorSetLayout(){
    let obstacleLayoutBinding = new VkDescriptorSetLayoutBinding();
    obstacleLayoutBinding.binding = 0;
    obstacleLayoutBinding.descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
    obstacleLayoutBinding.descriptorCount = 1;
    obstacleLayoutBinding.stageFlags = VK_SHADER_STAGE_COMPUTE_BIT;

    let obstaclePointLayoutBinding = new VkDescriptorSetLayoutBinding();
    obstaclePointLayoutBinding.binding = 1;
    obstaclePointLayoutBinding.descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
    obstaclePointLayoutBinding.descriptorCount = 1;
    obstaclePointLayoutBinding.stageFlags = VK_SHADER_STAGE_COMPUTE_BIT;

    let lightLayoutBinding = new VkDescriptorSetLayoutBinding();
    lightLayoutBinding.binding = 2;
    lightLayoutBinding.descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
    lightLayoutBinding.descriptorCount = 1;
    lightLayoutBinding.stageFlags = VK_SHADER_STAGE_COMPUTE_BIT;

    let outputLayoutBinding = new VkDescriptorSetLayoutBinding();
    outputLayoutBinding.binding = 3;
    outputLayoutBinding.descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
    outputLayoutBinding.descriptorCount = 1;
    outputLayoutBinding.stageFlags = VK_SHADER_STAGE_COMPUTE_BIT;

    let uboLayoutBinding = new VkDescriptorSetLayoutBinding();
    uboLayoutBinding.binding = 4;
    uboLayoutBinding.descriptorType = VK_DESCRIPTOR_TYPE_UNIFORM_BUFFER;
    uboLayoutBinding.descriptorCount = 1;
    uboLayoutBinding.stageFlags = VK_SHADER_STAGE_COMPUTE_BIT;

    this.descriptorSetLayout = new VkDescriptorSetLayout();
    let layoutInfo = new VkDescriptorSetLayoutCreateInfo();
    layoutInfo.bindingCount = 5;
    layoutInfo.pBindings = [obstacleLayoutBinding, obstaclePointLayoutBinding, lightLayoutBinding, outputLayoutBinding, uboLayoutBinding];// ...

    if (vkCreateDescriptorSetLayout(this.device, layoutInfo, null, this.descriptorSetLayout) != VK_SUCCESS) {
      throw new Error("Failed to create descriptor set layout.");
    }


  }

  createComputePipeline() {
    let computeShaderCode = new Uint8Array(fs.readFileSync('./client/shaders/out/comp.spv', null));
    // let fragShaderCode = new Uint8Array(fs.readFileSync('./shaders/out/frag.spv', null));
    this.computeShaderModule = this.createShaderModule(computeShaderCode);
    // let fragShaderModule = this.createShaderModule(fragShaderCode);

    let computeShaderStageInfo = new VkPipelineShaderStageCreateInfo();
    computeShaderStageInfo.stage = VK_SHADER_STAGE_COMPUTE_BIT;
    computeShaderStageInfo.module = this.computeShaderModule;
    computeShaderStageInfo.pName = "main";

    let shaderStages = [computeShaderStageInfo];

    // let bindingDescription = Vertex.getBindingDescription();
    // let attributeDescriptions = Vertex.getAttributeDescriptions();

    this.pipelineLayout = new VkPipelineLayout();

    let pipelineLayoutCreateInfo = new VkPipelineLayoutCreateInfo();
    pipelineLayoutCreateInfo.setLayoutCount = 1;
    pipelineLayoutCreateInfo.pSetLayouts = [this.descriptorSetLayout];
    if (vkCreatePipelineLayout(this.device, pipelineLayoutCreateInfo, null, this.pipelineLayout) !== VK_SUCCESS){
      throw new Error("Failed to create pipeline layout.");
    }

    let pipelineCreateInfo = new VkComputePipelineCreateInfo();
    pipelineCreateInfo.stage = computeShaderStageInfo;
    pipelineCreateInfo.layout = this.pipelineLayout;

    this.computePipeline = new VkPipeline();

    if(vkCreateComputePipelines(this.device, null, 1, [pipelineCreateInfo], null, [this.computePipeline]) != VK_SUCCESS) {
      throw new Error("Failed to create compute pipeline.");
    }

  }


  createShaderModule(code){
    let createInfo = new VkShaderModuleCreateInfo();
    createInfo.codeSize = code.length;
    createInfo.pCode = code;
    let shaderModule = new VkShaderModule();
    if (vkCreateShaderModule(this.device, createInfo, null, shaderModule) !== VK_SUCCESS) {
      throw new Error("Failed to create shader module.");
    }
    return shaderModule;
  }


  createCommandPool(){
    this.commandPool = new VkCommandPool();
    let queueFamilyIndices = this.indices;
    let poolInfo = new VkCommandPoolCreateInfo();
    poolInfo.queueFamilyIndex = queueFamilyIndices.computeFamily;
    poolInfo.flags = VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT;

    if (vkCreateCommandPool(this.device, poolInfo, null, this.commandPool) !== VK_SUCCESS) {
      throw new Error('Failed to create command pool.');
    }
  }

  findMemoryType(typeFilter, properties){
    let memProperties = new VkPhysicalDeviceMemoryProperties();
    vkGetPhysicalDeviceMemoryProperties(this.physicalDevice, memProperties);
    for (let i = 0; i < memProperties.memoryTypeCount; i ++) {
      if ((typeFilter & (1 << i)) && (memProperties.memoryTypes[i].propertyFlags & properties) == properties) {
        return i;
      }
    }
    throw new Error("Failed to find suitable memory type.");
  }

  createBuffer(size, usage, properties, buffer, memory){
    let bufferInfo = new VkBufferCreateInfo();
    bufferInfo.size = size;
    bufferInfo.usage = usage;
    bufferInfo.sharingMode = VK_SHARING_MODE_EXCLUSIVE;
    if (vkCreateBuffer(this.device, bufferInfo, null, buffer) != VK_SUCCESS) {
      throw new Error("Failed to create buffer!");
    }

    let memRequirements = new VkMemoryRequirements();
    vkGetBufferMemoryRequirements(this.device, buffer, memRequirements);

    let allocInfo = new VkMemoryAllocateInfo();
    allocInfo.allocationSize = memRequirements.size;
    allocInfo.memoryTypeIndex = this.findMemoryType(memRequirements.memoryTypeBits, properties);
    let result = vkAllocateMemory(this.device, allocInfo, null, memory)
    if (result != VK_SUCCESS) {
      throw new Error("Failed to allocate buffer memory. Size: " + memRequirements.size + ", " + result );
    }
    result = vkBindBufferMemory(this.device, buffer, memory, 0n);
    if (result != VK_SUCCESS) throw new Error("Failed to bind buffer memory. " + result)
  }

  // copyBuffer(srcBuffer, dstBuffer, size){
  //   let allocInfo = new VkCommandBufferAllocateInfo();
  //   allocInfo.level = VK_COMMAND_BUFFER_LEVEL_PRIMARY;
  //   allocInfo.commandPool = this.commandPool;
  //   allocInfo.commandBufferCount = 1;
  //
  //   let commandBuffer = new VkCommandBuffer();
  //   vkAllocateCommandBuffers(this.device, allocInfo, [commandBuffer]);
  //
  //   let beginInfo = new VkCommandBufferBeginInfo();
  //   beginInfo.flags = VK_COMMAND_BUFFER_USAGE_ONE_TIME_SUBMIT_BIT;
  //
  //   vkBeginCommandBuffer(commandBuffer, beginInfo);
  //
  //   let copyRegion = new VkBufferCopy();
  //   copyRegion.size = size;
  //   vkCmdCopyBuffer(commandBuffer, srcBuffer, dstBuffer, 1, [copyRegion]);
  //
  //   vkEndCommandBuffer(commandBuffer);
  //
  //   let submitInfo = new VkSubmitInfo();
  //   submitInfo.commandBufferCount = 1;
  //   submitInfo.pCommandBuffers = [commandBuffer];
  //   vkQueueSubmit(this.graphicsQueue, 1, [submitInfo], null);
  //   vkQueueWaitIdle(this.graphicsQueue);
  //   vkFreeCommandBuffers(this.device, this.commandPool, 1, [commandBuffer]);
  // }

  createObstacleBuffer(size){
    this.obstacleBuffer = new VkBuffer();
    this.obstacleBufferMemory = new VkDeviceMemory();

    this.createBuffer(Math.max(size, 8), VK_BUFFER_USAGE_STORAGE_BUFFER_BIT, VK_MEMORY_PROPERTY_HOST_COHERENT_BIT | VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT, this.obstacleBuffer, this.obstacleBufferMemory);

  }

  createObstaclePointBuffer(size){
    this.obstaclePointBuffer = new VkBuffer();
    this.obstaclePointBufferMemory = new VkDeviceMemory();

    this.createBuffer(Math.max(size, 8), VK_BUFFER_USAGE_STORAGE_BUFFER_BIT, VK_MEMORY_PROPERTY_HOST_COHERENT_BIT | VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT, this.obstaclePointBuffer, this.obstaclePointBufferMemory);

  }

  createLightBuffer(size){
    this.lightBuffer = new VkBuffer();
    this.lightBufferMemory = new VkDeviceMemory();

    this.createBuffer(Math.max(size, 12 * 4), VK_BUFFER_USAGE_STORAGE_BUFFER_BIT, VK_MEMORY_PROPERTY_HOST_COHERENT_BIT | VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT, this.lightBuffer, this.lightBufferMemory);


  }

  createOutputBuffer(size){
    this.outputBuffer = new VkBuffer();
    this.outputBufferMemory = new VkDeviceMemory();

    this.createBuffer(size, VK_BUFFER_USAGE_STORAGE_BUFFER_BIT, VK_MEMORY_PROPERTY_HOST_COHERENT_BIT | VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT, this.outputBuffer, this.outputBufferMemory);

    // let data = {$: 0n};
    // vkMapMemory(this.device, this.outputBufferMemory, 0, size, 0, data);
    // let pMappedMemory = new Float32Array(ArrayBuffer.fromAddress(data.$, size));
    // pMappedMemory.fill(3);
    // console.log(pMappedMemory.length);
    // vkUnmapMemory(this.device, this.outputBufferMemory);

  }

  createUniformBuffer(){
    this.uniformBuffer = new VkBuffer();
    this.uniformBufferMemory = new VkDeviceMemory();

    this.createBuffer(UniformBufferObject.size, VK_BUFFER_USAGE_UNIFORM_BUFFER_BIT, VK_MEMORY_PROPERTY_HOST_COHERENT_BIT | VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT, this.uniformBuffer, this.uniformBufferMemory);

  }

  createDescriptorPool(){
    let poolSizeStorage = new VkDescriptorPoolSize();
    poolSizeStorage.type = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
    poolSizeStorage.descriptorCount = 4;

    let poolSizeUniform = new VkDescriptorPoolSize();
    poolSizeUniform.type = VK_DESCRIPTOR_TYPE_UNIFORM_BUFFER;
    poolSizeUniform.descriptorCount = 1;

    let poolInfo = new VkDescriptorPoolCreateInfo();
    poolInfo.poolSizeCount = 2;
    poolInfo.pPoolSizes = [poolSizeStorage, poolSizeUniform];//
    poolInfo.maxSets = 1;
    this.descriptorPool = new VkDescriptorPool();
    if (vkCreateDescriptorPool(this.device, poolInfo, null, this.descriptorPool) !== VK_SUCCESS) {
      throw new Error("Failed to create descriptor pool.");
    }
  }

  createDescriptorSet(obstacleSize, pointSize, lightSize, screenSize){
    vkResetDescriptorPool(this.device, this.descriptorPool, 0);
    // console.log(obstacleSize, pointSize, lightSize, screenSize);
    let layouts = [this.descriptorSetLayout];
    let allocInfo = new VkDescriptorSetAllocateInfo();
    allocInfo.descriptorPool = this.descriptorPool;
    allocInfo.descriptorSetCount = 1;
    allocInfo.pSetLayouts = layouts;
    let descriptorSets = STDVector(VkDescriptorSet, 1);
    if (vkAllocateDescriptorSets(this.device, allocInfo, descriptorSets) != VK_SUCCESS) {
      throw new Error("Failed to allocate descriptor sets.");
    }
    this.descriptorSet = descriptorSets[0];
    let obstacleBufferInfo = new VkDescriptorBufferInfo();
    obstacleBufferInfo.buffer = this.obstacleBuffer;
    obstacleBufferInfo.offset = 0;
    obstacleBufferInfo.range = VK_WHOLE_SIZE;//Math.max(obstacleSize, 8);



    let obstaclePointBufferInfo = new VkDescriptorBufferInfo();
    obstaclePointBufferInfo.buffer = this.obstaclePointBuffer;
    obstaclePointBufferInfo.offset = 0;
    obstaclePointBufferInfo.range = VK_WHOLE_SIZE;

    let lightBufferInfo = new VkDescriptorBufferInfo();
    lightBufferInfo.buffer = this.lightBuffer;
    lightBufferInfo.offset = 0;
    lightBufferInfo.range =  VK_WHOLE_SIZE;

    let outputBufferInfo = new VkDescriptorBufferInfo();
    outputBufferInfo.buffer = this.outputBuffer;
    outputBufferInfo.offset = 0;
    outputBufferInfo.range =  VK_WHOLE_SIZE;

    let uniformBufferInfo = new VkDescriptorBufferInfo();
    uniformBufferInfo.buffer = this.uniformBuffer;
    uniformBufferInfo.offset = 0;
    uniformBufferInfo.range = UniformBufferObject.size;

    let descriptorWriteStorage = new VkWriteDescriptorSet();
    descriptorWriteStorage.dstSet = this.descriptorSet;
    descriptorWriteStorage.dstBinding = 0;
    descriptorWriteStorage.dstArrayElement = 0;
    descriptorWriteStorage.descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
    descriptorWriteStorage.descriptorCount = 4;
    descriptorWriteStorage.pBufferInfo = [obstacleBufferInfo, obstaclePointBufferInfo, lightBufferInfo, outputBufferInfo];//

    let descriptorWriteUniform = new VkWriteDescriptorSet();
    descriptorWriteUniform.dstSet = this.descriptorSet;
    descriptorWriteUniform.dstBinding = 4;
    descriptorWriteUniform.dstArrayElement = 0;
    descriptorWriteUniform.descriptorType = VK_DESCRIPTOR_TYPE_UNIFORM_BUFFER;
    descriptorWriteUniform.descriptorCount = 1;
    descriptorWriteUniform.pBufferInfo = [uniformBufferInfo];

    vkUpdateDescriptorSets(this.device, 2, [descriptorWriteStorage, descriptorWriteUniform], 0, null);//
  }

  createCommandBuffer(screenSize){
    if (this.commandBuffer) {
      if (vkResetCommandBuffer(this.commandBuffer, VK_COMMAND_BUFFER_RESET_RELEASE_RESOURCES_BIT) != VK_SUCCESS) {
        throw new Error("Failed to reset command buffer")
      }
    } else {
      this.commandBuffer = new VkCommandBuffer();
      let allocInfo = new VkCommandBufferAllocateInfo();
      allocInfo.commandPool = this.commandPool;
      allocInfo.level = VK_COMMAND_BUFFER_LEVEL_PRIMARY;
      allocInfo.commandBufferCount = 1;
      if (vkAllocateCommandBuffers(this.device, allocInfo, [this.commandBuffer]) !== VK_SUCCESS) {
        throw new Error("Failed to create command buffers.");
      }
    }

    let beginInfo = new VkCommandBufferBeginInfo();
    beginInfo.flags = 0;
    if (vkBeginCommandBuffer(this.commandBuffer, beginInfo) != VK_SUCCESS) {
      throw new Error("Failed to begin recording command buffer.");
    }

    vkCmdBindPipeline(this.commandBuffer, VK_PIPELINE_BIND_POINT_COMPUTE, this.computePipeline);
    vkCmdBindDescriptorSets(this.commandBuffer, VK_PIPELINE_BIND_POINT_COMPUTE, this.pipelineLayout, 0, 1, [this.descriptorSet], 0, null);


    vkCmdDispatch(this.commandBuffer, Math.ceil(screenSize.width / WORKGROUP_SIZE), Math.ceil(screenSize.height / WORKGROUP_SIZE), 1);

    if (vkEndCommandBuffer(this.commandBuffer) != VK_SUCCESS) {
      throw new Error("Failed to record command buffer");
    }
  }

  // createSyncObjects(){
  //     this.imageAvaialableSemaphores = STDVector( VkSemaphore, MAX_FRAMES_IN_FLIGHT);
  //     this.renderFinishedSemaphores = STDVector( VkSemaphore, MAX_FRAMES_IN_FLIGHT);
  //     this.inFlightFences = STDVector(VkFence, MAX_FRAMES_IN_FLIGHT);
  //     this.imagesInFlight = [].fill(null, 0, this.swapChainImages.length);
  //
  //     let semaphoreInfo = new VkSemaphoreCreateInfo();
  //     let fenceInfo = new VkFenceCreateInfo();
  //     fenceInfo.flags = VK_FENCE_CREATE_SIGNALED_BIT;
  //     for (let i = 0; i < MAX_FRAMES_IN_FLIGHT; i ++) {
  //       if (vkCreateSemaphore(this.device, semaphoreInfo, null, this.imageAvaialableSemaphores[i]) !== VK_SUCCESS ||
  //           vkCreateSemaphore(this.device, semaphoreInfo, null, this.renderFinishedSemaphores[i]) !== VK_SUCCESS  ||
  //           vkCreateFence(this.device, fenceInfo, null, this.inFlightFences[i]) != VK_SUCCESS) {
  //         throw new Error("Failed to create synchronization objects for frame " + i + ".");
  //       }
  //     }
  //
  //
  // }

  cleanup(code){
    vkDeviceWaitIdle(this.device);
    console.log("Recieved code " + code);
    console.log("Cleaning up....");

    this.cleanupDependants();

    vkFreeMemory(this.device, this.obstacleBufferMemory, null);
    vkDestroyBuffer(this.device, this.obstacleBuffer, null);
    vkFreeMemory(this.device, this.obstaclePointBufferMemory, null);
    vkDestroyBuffer(this.device, this.obstaclePointBuffer, null);
    vkFreeMemory(this.device, this.lightBufferMemory, null);
    vkDestroyBuffer(this.device, this.lightBuffer, null);
    vkFreeMemory(this.device, this.outputBufferMemory, null);
    vkDestroyBuffer(this.device, this.outputBuffer, null);
    vkFreeMemory(this.device, this.uniformBufferMemory, null);
    vkDestroyBuffer(this.device, this.uniformBuffer, null);

    vkDestroyDescriptorPool(this.device, this.descriptorPool, null);
    vkDestroyCommandPool(this.device, this.commandPool, null);
    vkDestroyShaderModule(this.device, this.computeShaderModule, null);
    vkDestroyPipeline(this.device, this.computePipeline, null);
    vkDestroyPipelineLayout(this.device, this.pipelineLayout, null);
    vkDestroyDescriptorSetLayout(this.device, this.descriptorSetLayout, null);

    vkDestroyDevice(this.device, null);
    vkDestroyInstance(this.instance, null);

    process.off('exit', this.cleanup);
    // process.off('uncaughtException');
    console.log("Done! Goodbye!");
  }

  runCommandBuffer(){
    let submitInfo = new VkSubmitInfo();
    submitInfo.commandBufferCount = 1;
    submitInfo.pCommandBuffers = [this.commandBuffer];

    let fence = new VkFence();
    let fenceCreateInfo = new VkFenceCreateInfo();
    fenceCreateInfo.flags = 0;
    if (vkCreateFence(this.device, fenceCreateInfo, null, fence) !== VK_SUCCESS) {
      throw new Error("Failed to create fence");
    }

    if (vkQueueSubmit(this.computeQueue, 1, [submitInfo], fence) !== VK_SUCCESS) {
      throw new Error("Failed to submit queue.");
    }

    if (vkWaitForFences(this.device, 1, [fence], true, Number.MAX_SAFE_INTEGER)!= VK_SUCCESS) {
      throw new Error("Failed to wait for fence");
    }

    vkDestroyFence(this.device, fence, null);
  }

  cleanupDependants(){
    // vkDestroyDescriptorSet(this.device, this.descriptorSet, null);
  }

  calculateLighting(data){
    let startTime = process.hrtime.bigint();
    let { screenSize, numObstacles, numLights, ambientLight } = data;
    let obstacleData = new Uint8Array(data.obstacleData), obstaclePointData = new Uint8Array(data.obstaclePointData), lightData = new Uint8Array(data.lightData);

    /*
      obstacleData: Uint8Array[] for Obstacle intances.
      obstaclePointData: Uint8Array[] for Obstacle point data.
      lightData: Uint8Array[] for Light intances.
      screenSize: {
        width: Number representing the width of the screen in pixels,
        height: Number representing the height of the screen in pixels
      }
    */

    //If the buffer sizes have changed recreate them and recreate all their dependants.

    let resizeStart = process.hrtime.bigint();

    let screenByteLength = 4 * screenSize.width * screenSize.height;
    if (this.dependantsInitialised) {
      let needsUpdate = false;

      if (this.oldSizes.obstacle != obstacleData.length) {
        needsUpdate = true;
        vkFreeMemory(this.device, this.obstacleBufferMemory, null);
        vkDestroyBuffer(this.device, this.obstacleBuffer, null);
        this.createObstacleBuffer(obstacleData.length);
      }

      if (this.oldSizes.point != obstaclePointData.length) {
        needsUpdate = true;
        vkFreeMemory(this.device, this.obstaclePointBufferMemory, null);
        vkDestroyBuffer(this.device, this.obstaclePointBuffer, null);
        this.createObstaclePointBuffer(obstaclePointData.length);
      }

      if (this.oldSizes.light != lightData.length) {
        needsUpdate = true;
        vkFreeMemory(this.device, this.lightBufferMemory, null);
        vkDestroyBuffer(this.device, this.lightBuffer, null);

        this.createLightBuffer(lightData.length);
      }

      if (this.oldSizes.screen != screenByteLength) {
        needsUpdate = true;
        vkFreeMemory(this.device, this.outputBufferMemory, null);
        vkDestroyBuffer(this.device, this.outputBuffer, null);

        this.createOutputBuffer(screenByteLength);
      }
      if (needsUpdate) {
        console.log("Sizes changed");
        this.cleanupDependants();
        //obstacleSize, pointSize, lightSize, screenSize
        this.createDescriptorSet(obstacleData.length, obstaclePointData.length, lightData.length, screenByteLength);
        this.createCommandBuffer(screenSize);
      }
    } else {
      this.createObstacleBuffer(obstacleData.length);
      this.createObstaclePointBuffer(obstaclePointData.length);
      this.createLightBuffer(lightData.length);
      this.createOutputBuffer(screenByteLength);
      this.createDescriptorSet(obstacleData.length, obstaclePointData.length, lightData.length, screenByteLength);
      this.createCommandBuffer(screenSize);
      this.dependantsInitialised = true;
    }

    this.oldSizes = {obstacle: obstacleData.length, point: obstaclePointData.length, light: lightData.length, screen: screenByteLength};

    let resizeEnd = process.hrtime.bigint();
    this.updatePerformance('resize', resizeEnd - resizeStart);


    let memoryMapStart = process.hrtime.bigint();
    let mappedMemory = {$: 0n};



    vkMapMemory(this.device, this.obstacleBufferMemory, 0, obstacleData.length, 0, mappedMemory);
    let pMappedMemory = new Uint8Array(ArrayBuffer.fromAddress(mappedMemory.$, obstacleData.length));
    pMappedMemory.set(obstacleData, 0x0);
    vkUnmapMemory(this.device, this.obstacleBufferMemory);

    vkMapMemory(this.device, this.obstaclePointBufferMemory, 0, obstaclePointData.length, 0, mappedMemory);
    pMappedMemory = new Uint8Array(ArrayBuffer.fromAddress(mappedMemory.$, obstaclePointData.length));
    pMappedMemory.set(obstaclePointData, 0x0);
    vkUnmapMemory(this.device, this.obstaclePointBufferMemory);

    vkMapMemory(this.device, this.lightBufferMemory, 0, lightData.length, 0, mappedMemory);
    pMappedMemory = new Uint8Array(ArrayBuffer.fromAddress(mappedMemory.$, lightData.length));
    pMappedMemory.set(lightData, 0x0);
    vkUnmapMemory(this.device, this.lightBufferMemory);

    vkMapMemory(this.device, this.uniformBufferMemory, 0, UniformBufferObject.size, 0, mappedMemory);
    pMappedMemory = new Uint32Array(ArrayBuffer.fromAddress(mappedMemory.$, UniformBufferObject.size));
    let uboData = new UniformBufferObject(new ivec2(screenSize.width, screenSize.height), numObstacles, numLights, new vec3(ambientLight.r/255, ambientLight.g/255, ambientLight.b/255)).int32;
    // console.log(uboData);
    pMappedMemory.set(uboData, 0x0);
    vkUnmapMemory(this.device, this.uniformBufferMemory);

    let memoryMapEnd = process.hrtime.bigint();
    this.updatePerformance('memoryMap', memoryMapEnd - memoryMapStart);

    let commandStart = process.hrtime.bigint();

    this.runCommandBuffer();

    let commandEnd = process.hrtime.bigint();
    this.updatePerformance('runCommand', commandEnd - commandStart );
    let getImageStart = process.hrtime.bigint();
    // let image = outBuffer instanceof Uint8Array?outBuffer:new Uint8Array(screenByteLength);

    let result = vkMapMemory(this.device, this.outputBufferMemory, 0, screenByteLength, 0, mappedMemory);
    if (result != VK_SUCCESS) {
      throw new Error("Failed to map memory " + result);
    }
    // console.log("Before image");
    let buffer1 = Buffer.from(ArrayBuffer.fromAddress(mappedMemory.$, screenByteLength));
    let buffer2 = Buffer.alloc(screenByteLength);
    let copyStart = process.hrtime.bigint();
    buffer1.copy(buffer2);
    let copyEnd = process.hrtime.bigint();
    let image = buffer2.buffer;
    // buffer.copy(image);
    this.updatePerformance('copyBuf', copyEnd - copyStart);

    // let image = screenByteLength % 4 == 0? new Uint32Array(new Uint32Array(buffer)).buffer :new Uint8Array(new Uint8Array(buffer)).buffer;//.slice(0);
    // let image = new Uint8Array(new Uint8Array(buffer));//.slice(0);
    // console.log("After image");


    // console.log("Before unmap");
    vkUnmapMemory(this.device, this.outputBufferMemory);
    // console.log("After unmap");

    let getImageEnd = process.hrtime.bigint();
    this.updatePerformance('getImage', getImageEnd - getImageStart);
    // console.log(image.length);
    let endTime = process.hrtime.bigint();
    this.updatePerformance('total', endTime - startTime);

    // console.log("Returning");
    return image;


  }

  updatePerformance(group, time) {
    let perfObj = this.performance.get(group);
    perfObj.lastTime = time;
    perfObj.totalTime += perfObj.lastTime;
    perfObj.numCalls ++;
    perfObj.avgTime = perfObj.totalTime / perfObj.numCalls;
    perfObj.minTime = perfObj.lastTime < perfObj.minTime ? perfObj.lastTime : perfObj.minTime;
    perfObj.maxTime = perfObj.lastTime > perfObj.maxTime ? perfObj.lastTime : perfObj.maxTime;

  }

  addPerformanceGroup(group) {
    this.performance.set(group, {lastTime: 0n, totalTime: 0n, numCalls: 0n, avgTime: 0n, minTime: Infinity, maxTime: -Infinity})
  }

  getPerformanceInfo(){
    return Array.from(this.performance.entries()).map(([group, data])=>{
      return (
`Group '${group}:'
┃ Last Call Time: ${data.lastTime} ns
┃ Avg. Call Time: ${data.avgTime} ns
┃ Total Call Time: ${(Number(data.totalTime) / 1e+9).toFixed(3)} s
┃ Min / Max Time: ${data.minTime} ns / ${data.maxTime} ns
┗━`);
}).join('\n');
  }

}

// let app;

// process.on('uncaughtException', (e)=>{
//   console.error(e);
//   app.cleanup();
//   process.exit();
// })

class QueueFamilyIndices {
  constructor(){
    this.computeFamily = null;
  }

  isComplete(){
    return this.computeFamily !== null;
  }
}

module.exports = LightingEngine;

// app = new LightingEngine();
