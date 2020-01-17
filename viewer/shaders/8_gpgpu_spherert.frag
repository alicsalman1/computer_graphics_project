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


vec3 get_refraction(in vec3 incidentRay, in vec3 normal, in float coef){
    float cosi = dot(incidentRay, normal);

    return normalize(coef * incidentRay + (coef * cosi - sqrt(1 - coef * coef * (1 - cosi * cosi))) * normal);
}


float computefresnel(vec3 I, vec3 N, float ior){
    float cosi = dot(I, N);
    float etai = 1;
    float etat = ior;
    float kr;
    if(cosi > 0){
        etai = etat;
        etat = 1;
    }

    float sint = (etai / etat) * sqrt(max(0, 1 - cosi * cosi));
    if(sint > 1){
        kr = 1;
    }
    else{
        float cost = sqrt(max(0, 1 - sint * sint));
        cosi = abs(cosi);
        float Rs = ((etat * cosi) - (etai * cost)) / ((etat * cosi) + (etai * cost)); 
        float Rp = ((etai * cosi) - (etat * cost)) / ((etai * cosi) + (etat * cost)); 
        kr = (Rs * Rs + Rp * Rp) / 2;
    }
    return kr;
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

    if(raySphereIntersect(eye, u, intersect)){
        vec3 reflectedRay;
        vec3 sphere_normal = normalize(intersect - center); 

        if(transparent){
            
            vec3 refractedRay = get_refraction(u, sphere_normal, 1.0003/1.517);
            vec3 intersect_array[4];
            float F = computefresnel(u, sphere_normal, 1.517);

            raySphereIntersect(intersect, refractedRay, intersect_array[0]);
            vec3 refractedRay2 = get_refraction(refractedRay, normalize(intersect_array[0] - center), 1.517/1.0003);
            float F1 = computefresnel(refractedRay, normalize(intersect_array[0] - center), 1.517);

            vec3 reflectedRay2 = get_reflection(refractedRay, normalize(intersect_array[0] - center));
            raySphereIntersect(intersect_array[0], reflectedRay2, intersect_array[1]);
            vec3 refractedRay3 = get_refraction(reflectedRay2, normalize(intersect_array[1] - center), 1.517/1.0003);
            float F2 = computefresnel(refractedRay3, normalize(intersect_array[1] - center), 1.517);

            vec3 reflectedRay3 = get_reflection(reflectedRay2, normalize(intersect_array[1] - center));
            raySphereIntersect(intersect_array[1], reflectedRay3, intersect_array[2]);
            vec3 refractedRay4 = get_refraction(reflectedRay3, normalize(intersect_array[2] - center), 1.517/1.0003);
            float F3 = computefresnel(refractedRay4, normalize(intersect_array[2] - center), 1.517);

            vec3 reflectedRay4 = get_reflection(reflectedRay3, normalize(intersect_array[2] - center));
            raySphereIntersect(intersect_array[2], reflectedRay4, intersect_array[3]);
            vec3 refractedRay5 = get_refraction(reflectedRay4, normalize(intersect_array[3] - center), 1.517/1.0003);
            float F4 = computefresnel(refractedRay5, normalize(intersect_array[3] - center), 1.517);

            textcolor = (1 - F) * ((1 - F1) * getColorFromEnvironment(refractedRay2) +
                                   F1 * (1 - F2) * getColorFromEnvironment(refractedRay3) +
                                   F1 * F2 * (1 - F3) * getColorFromEnvironment(refractedRay4) +
                                   F1 * F2 * F3 * (1 - F4) * getColorFromEnvironment(refractedRay5));
        }

        else{
            reflectedRay = get_reflection(u, sphere_normal);
            textcolor = getColorFromEnvironment(reflectedRay);        
        }
    }

    else{
        textcolor = getColorFromEnvironment(u);
    }
    
    fragColor = textcolor;
}
