#version 410

uniform mat4 matrix;
uniform mat4 perspective;
uniform mat3 normalMatrix;
uniform bool noColor;
uniform vec3 lightPosition;
uniform float Red;
uniform float Green;
uniform float Blue;

// World coordinates
in vec4 vertex;
in vec4 normal;
in vec4 color;

// Camera-space coordinates
out vec4 eyeVector;
out vec4 lightVector;
out vec4 lightSpace; // placeholder for shadow mapping
out vec4 vertColor;
out vec4 vertNormal;

void main( void )
{   
    if (noColor) vertColor = vec4(Red, Green, Blue, 1.0);
    else vertColor = color;
    vertNormal.xyz = normalize(normalMatrix * normal.xyz);
    vertNormal.w = 0.0;

    // TODO: compute eyeVector, lightVector. 
    lightVector = normalize(matrix * vec4(lightPosition, 1) - matrix * vertex);
    eyeVector = normalize(vec4(0, 0, 0, 1) - matrix * vertex);

    gl_Position = perspective * matrix * vertex;
}
