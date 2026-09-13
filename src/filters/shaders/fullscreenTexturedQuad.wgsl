@group(0) @binding(0) var mySampler : sampler;
@group(0) @binding(1) var myTexture : texture_2d<f32>;

struct VertexInput {
  @location(0) Position: vec2f,
  @location(1) Color: vec3f,
};

struct VertexOutput {
  @builtin(position) Position : vec4f,
  @location(0) Color : vec2f,
}

struct Uniforms {
        scale: f32,
        canvasWidth: f32,
        canvasHeight: f32,
        imageWidth: f32,
        imageHeight: f32,

        offset: vec2f,
    };

@group(1) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn vert_main(@builtin(vertex_index) VertexIndex : u32) -> VertexOutput {
  let scale = uniforms.scale;
  let offsetX = uniforms.offset[0];
  let offsetY = uniforms.offset[1];

  // Рассчитываем размер изображения в пикселях холста с учетом масштаба
  let scaledImageWidth = uniforms.imageWidth * scale;
  let scaledImageHeight = uniforms.imageHeight * scale;

  // Преобразуем в NDC (от -1 до 1)
  let ndcX = scaledImageWidth / uniforms.canvasWidth;
  let ndcY = scaledImageHeight / uniforms.canvasHeight;

  // Центр изображения с учетом смещения
  let centerX = offsetX;
  let centerY = offsetY;

  let pos = array(
    // Верхний правый угол
    vec2( centerX + ndcX,  centerY + ndcY),
    // Нижний правый угол
    vec2( centerX + ndcX,  centerY - ndcY),
    // Нижний левый угол
    vec2( centerX - ndcX,  centerY - ndcY),
    // Верхний правый угол (повтор)
    vec2( centerX + ndcX,  centerY + ndcY),
    // Нижний левый угол (повтор)
    vec2( centerX - ndcX,  centerY - ndcY),
    // Верхний левый угол
    vec2( centerX - ndcX,  centerY + ndcY),
  );

  // Стандартные UV-координаты (0..1)
  let uv = array(
    vec2(1.0, 0.0),
    vec2(1.0, 1.0),
    vec2(0.0, 1.0),
    vec2(1.0, 0.0),
    vec2(0.0, 1.0),
    vec2(0.0, 0.0),
  );

  var output : VertexOutput;
  output.Position = vec4(pos[VertexIndex], 0.0, 1.0);
  output.Color = uv[VertexIndex];
  return output;
}



@fragment
fn frag_main(@location(0) fragUV : vec2f) -> @location(0) vec4f {
    return textureSample(myTexture, mySampler, fragUV);
}
