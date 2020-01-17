#version 410
#define M_PI 3.14159265358979323846

uniform mat4 mat_inverse;
uniform mat4 persp_inverse;
uniform sampler2D envMap;
uniform vec3 center;
uniform float radius;

uniform bool transparent;
uniform float shininess;
uniform float eta;

in vec4 position;
in vec2 textCoords;
in vec4 vertNormal;

out vec4 fragColor;


vec4 getColorFromEnvironment(in vec3 direction)
{
    // TODO
    float sphereRadius = length(direction);
    float latitute = acos(direction.z/ sphereRadius);
    float longtitute = atan(direction.y , direction.x);
    vec2 coord = vec2(longtitute/(2*M_PI) + 0.5, latitute/M_PI);
    return texture(envMap, coord);
    // return vec4(1);
}


bool raySphereIntersect(in vec3 start, in vec3 direction, out vec3 newPoint) {
    
    float t = dot(center - start, direction);
    vec3 p = start + direction * t;

    float y = length(center - p);

    if(y < radius){
        float x = sqrt(radius * radius -  y * y);
        float t1 = t - x;
        float t2 = t + x;
        newPoint = start + direction * t1;
  
        return true;
    }
    return false;
}


vec3 get_reflection(in vec3 incidentRay, in vec3 normal){

    return normalize(incidentRay - 2 * dot(incidentRay, normal) * normal);
}


vec3 get_refraction(in vec3 incidentRay){

    float coef = 1.0003/1.517;
    float cosi = dot(incidentRay, vertNormal.xyz);

    return normalize(coef * incidentRay + (coef * cosi - sqrt(1 - coef * coef * (1 - cosi * cosi))) * vertNormal.xyz);
}


float computefresnel(float eta, float cosangle)
{
     float ci = sqrt(eta * eta - (1 - cosangle * cosangle));
     float fs = pow((cosangle - ci)/(cosangle + ci), 2);
     float fp = pow((eta * eta * cosangle - ci)/(eta * eta * cosangle + ci), 2);  

     return (fs + fp)/2;
}


void main(void){
    // Step 1: I need pixel coordinates. Division by w?
    vec4 worldPos = position;
    worldPos.z = 1; // near clipping plane
    worldPos = persp_inverse * worldPos;
    worldPos /= worldPos.w;
    worldPos.w = 0;
    worldPos = normalize(worldPos);
    // Step 2: ray direction:
    vec3 u = normalize((mat_inverse * worldPos).xyz);
    vec3 eye = (mat_inverse * vec4(0, 0, 0, 1)).xyz;
    
    // TODO

    //Ray-Sphere intersection
    vec4 textcolor;
    vec3 intersect;

    textcolor = getColorFromEnvironment(u);
    vec3 reflectedRay;

    if(raySphereIntersect(eye, u, intersect)){
        // color = 1;
        vec3 sphere_normal = normalize(intersect - center); 
        reflectedRay = get_reflection(u, sphere_normal);
        textcolor = getColorFromEnvironment(reflectedRay);        
    }
    
    fragColor = textcolor;
}
