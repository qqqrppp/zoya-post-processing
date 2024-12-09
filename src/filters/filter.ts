export abstract class Filter<T> {
    context: GPUCanvasContext;
    device: GPUDevice;
    format: GPUTextureFormat;
    imageBitmap: ImageBitmap;
    sampler: GPUSampler;
    // commandEncoder: GPUCommandEncoder;
    inputTexture: GPUTexture;
    outputTexute: GPUTexture;

    constructor(
        context: GPUCanvasContext,
        device: GPUDevice,
        format: GPUTextureFormat,
        imageBitmap: ImageBitmap,
        sampler: GPUSampler,

        inputTexture: GPUTexture,
        outputTexute: GPUTexture,
    ) {
        this.context = context;
        this.device = device;
        this.format = format;
        this.imageBitmap = imageBitmap;
        this.sampler = sampler

        // this.commandEncoder = commandEncoder;
        this.inputTexture = inputTexture;
        this.outputTexute = outputTexute;

    }

    computeWorkGroupCount(
        [width, height]: [number, number],
        [workgroup_width, workgroup_height]: [number, number],
    ): [number, number] {
        let x = (width + workgroup_width - 1) / workgroup_width;
        let y = (height + workgroup_height - 1) / workgroup_height;
    
        return [x, y]
    }

    abstract init(): (commandEncoder: GPUCommandEncoder, settings: T) => void;
}