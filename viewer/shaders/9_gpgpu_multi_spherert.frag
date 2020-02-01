#version 410
#define M_PI 3.14159265358979323846
#define NUM_SPHERES 3

uniform mat4 mat_inverse;
uniform mat4 persp_inverse;
uniform sampler2D envMap;
uniform vec3 center;
uniform float radius;

uniform float lightIntensity;
uniform bool transparent;
uniform float shininess;
uniform float eta;

in vec4 position;
in vec2 textCoords;
in vec4 vertNormal;

out vec4 fragColor;

struct Sphere{
    vec3 center;
    float radius;
    vec3 color;
};

struct Intersection{
    vec3 surface_point;
    vec3 surface_normal;
    vec3 ray;
    vec3 color;
};

Sphere spheres[NUM_SPHERES];
Intersection intersections[100];
vec4 light_pos = vec4(0.0, 0.0, 0.0, 1.0);

vec4 getColorFromEnvironment(in vec3 direction)
{
    float sphereRadius = length(direction);
    float latitute = acos(direction.z/ sphereRadius);
    float longtitute = atan(direction.y , direction.x);
    vec2 coord = vec2(longtitute/(2*M_PI) + 0.5, latitute/M_PI);

    return texture(envMap, coord);
}


bool raySphereIntersect(in vec3 start, in vec3 direction,in Sphere sphere, out vec3 newPoint) {
    
    float t = dot(sphere.center - start, direction);
    vec3 p = start + direction * t;

    float y = length(sphere.center - p);

    if(y < sphere.radius){
        float x = sqrt(sphere.radius * sphere.radius -  y * y);
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


float computefresnel(float eta, float cosangle)
{
     float ci = sqrt(eta * eta - (1 - cosangle * cosangle));
     float fs = pow((cosangle - ci)/(cosangle + ci), 2);
     float fp = pow((eta * eta * cosangle - ci)/(eta * eta * cosangle + ci), 2);  

     return (fs + fp)/2;
}

void initialize(){
    spheres[0].center = center;
    spheres[0].radius = radius;
    spheres[0].color = vec3(1.0, 0.0, 0.0);

    spheres[1].center = center - vec3(radius + 3, 2.0, 3.0);
    spheres[1].radius = radius;
    spheres[1].color = vec3(0.0, 1.0, 0.0);

    spheres[2].center = center - vec3(0, 0, radius + 3);
    spheres[2].radius = radius;
    spheres[2].color = vec3(0.0, 0.0, 1.0);
}

float fresnel (vec3 normal, vec3 light, float eta2)
{
    float cosine = dot(normal, light);
    if (cosine < 0)
        eta2 = 1/eta2;
    cosine = abs(cosine);
    float F0 = pow((1 - eta2)/(1 + eta2), 2);
    return (F0 + (1 - F0) * (pow(1 - cosine, 5)));
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

    initialize();
    vec3 color = vec3(0.0, 0.0, 0.0);
    vec3 min_intersect;
    vec3 intersect;
    bool is_intersect = false;
    Sphere spheretoshow;
    int counter = 0;
    vec3 incident_ray = u;
    vec3 start_point = eye;
    bool flag = true;
    bool it_reflect = false;

    // forward pass
    while(counter < NUM_SPHERES - 1){
        it_reflect = false;
        min_intersect = vec3(100.0, 100.0, 100.0);

        for(int i = 0; i < NUM_SPHERES; i++){
            
            is_intersect = raySphereIntersect(start_point, incident_ray, spheres[i], intersect);
            if(is_intersect && (distance(min_intersect, start_point) > distance(intersect, start_point))){
                min_intersect = intersect;
                spheretoshow = spheres[i];
                it_reflect = true;
            }
        }
        
        if(it_reflect == true){
            intersections[counter].surface_point = min_intersect;
            intersections[counter].surface_normal = normalize(min_intersect - spheretoshow.center);
            intersections[counter].ray = incident_ray;
            intersections[counter].color = spheretoshow.color;
        
            incident_ray = get_reflection(intersections[counter].ray, intersections[counter].surface_normal);
            start_point = intersections[counter].surface_point;
            counter++;
            
        }
        else{
            flag = false;
        }
    }

    int i = counter - 1;
    vec4 tmpcolor;
    tmpcolor = getColorFromEnvironment(get_reflection(intersections[i].ray, intersections[i].surface_normal));
    color = tmpcolor.xyz;

    //backward pass
    if(it_reflect){
        
        while(i > 0){
            float ka = 0.7;
            float kd = 0.5;
            vec4 specular;
            float F;

            float costheta = dot(normalize(vec4(intersections[i].surface_point, 1.0)), normalize(light_pos - vec4(intersections[i].surface_point, 1.0)));
            vec4 halfvector = normalize(normalize(vec4(intersections[i].surface_point, 1.0)) + normalize(light_pos - vec4(intersections[i].surface_point, 1.0)));
            
            F = computefresnel(eta, costheta);
    
            vec4 ambient = ka * vec4(intersections[i].color, 1.0) * lightIntensity;
            vec4 diffuse = kd * vec4(intersections[i].color, 1.0) * max(dot(vec4(intersections[i].surface_normal, 1.0), normalize(light_pos - vec4(intersections[i].surface_point, 1.0))), 0) * lightIntensity;
        
            specular = F *  vec4(intersections[i].color, 1.0) * pow(max(dot(vec4(intersections[i].surface_normal, 1.0), halfvector), 0), shininess) * lightIntensity;
            
            vec4 localcolor= ambient + diffuse + specular;

            if(i>0){
                color = (1 - fresnel(intersections[i-1].surface_normal, intersections[i-1].ray, eta)) * (localcolor.xyz+color);
            }

            else{
                color +=  getColorFromEnvironment(get_reflection(intersections[0].ray, intersections[0].surface_normal)).xyz;
            }
            i--;
        }    
       
        fragColor = vec4(color, 1.0);
    }

   else{
       fragColor = getColorFromEnvironment(u);
   }
}
