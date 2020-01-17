#version 410

uniform float lightIntensity;
uniform bool blinnPhong;
uniform bool fresnel;
uniform float shininess;
uniform float eta;
uniform sampler2D shadowMap;

in vec4 eyeVector;
in vec4 lightVector;
in vec4 vertColor;
in vec4 vertNormal;
in vec4 lightSpace;

out vec4 fragColor;

float computefresnel(float eta, float cosangle)
{
     float ci = sqrt(eta * eta - (1 - cosangle * cosangle));
     float fs = pow((cosangle - ci)/(cosangle + ci), 2);
     float fp = pow((eta * eta * cosangle - ci)/(eta * eta * cosangle + ci), 2);  

     return (fs + fp)/2;
}

float n_min(float r){
    return (1-r)/(1+r);
}
float n_max(float r){
    return (1+sqrt(r))/(1-sqrt(r)); 
}
float get_n(float r,float g){
    return n_min(r)*g + (1-g)*n_max(r);
}
float get_k2(float r, float n){
    float nr = (n+1)*(n+1)*r-(n-1)*(n-1);
    return nr/(1-r);
}
float get_r(float n, float k){
    return ((n-1)*(n-1)+k*k)/((n+1)*(n+1)+k*k);
}
float get_g(float n, float k){
    float r = get_r(n,k);
    return (n_max(r)-n)/(n_max(r)-n_min(r));
}
float Afresnel(float _r, float g,float theta){
    //clamp parameters
//     float _r = clamp(r,0,0.99);
    //compute n and k
    float n = get_n(_r,g);
    float k2 = get_k2(_r,n);

    float c = cos(theta);
    float rs_num = n*n + k2 - 2*n*c + c*c;
    float rs_den = n*n + k2 + 2*n*c + c*c;
    float rs = rs_num/rs_den;
    
    float rp_num = (n*n + k2)*c*c - 2*n*c + 1;
    float rp_den = (n*n + k2)*c*c + 2*n*c + 1;
    float rp = rp_num/rp_den;

    return 0.5*(rs+rp);
}



float shadowingG(float alpha, float cosangle)
{
     float tan_sqr = (1 - cosangle*cosangle)/(cosangle*cosangle);

     return 2/(1 + sqrt(1 + alpha*alpha + tan_sqr));
}

float microfacetNormalDistribution(float alpha, float cosangle)
{
     float tan_sqr = (1 - cosangle*cosangle)/(cosangle*cosangle); 
     float alpha_sqr = alpha*alpha;
     float pi = 3.14159;

     return (alpha_sqr)/(pi*pow(cosangle, 4)*pow(alpha_sqr+tan_sqr, 2));
}

void main( void )
{    
     float ka = 0.7;
     float kd = 0.5;
     vec4 specular;
     float F;
     // This is the place where there's work to be done

     float costheta = dot(eyeVector, lightVector);
     vec4 halfvector = normalize(eyeVector + lightVector);

     if(fresnel) 
     {
        F = computefresnel(eta, costheta);
     }
     else
     { 
        F = Afresnel(0.4, 0.5, costheta);
     }
     vec4 ambient = ka * vertColor * lightIntensity;
     vec4 diffuse = kd * vertColor * max(dot(vertNormal, lightVector), 0) * lightIntensity;

    // Blinn-Phong Model
     if (blinnPhong)
     {      
          specular = F * vertColor * pow(max(dot(vertNormal, halfvector), 0), shininess) * lightIntensity;
        
          fragColor = ambient + diffuse + specular;
     }

    // Cook- Model
     else
     {
          float alpha = 0.4;
          float cosh = dot(halfvector, vertNormal);
          float cosi = dot(vertNormal, lightVector);
          float coso = dot(vertNormal, eyeVector);

          float D = microfacetNormalDistribution(alpha, cosh);
          float G1i = shadowingG(alpha, cosi);
          float G1o = shadowingG(alpha, coso);

          specular = vertColor*lightIntensity*(F*D*G1i*G1o)/(4*cosi*coso);
          fragColor = ambient + diffuse + specular;
     }
}
