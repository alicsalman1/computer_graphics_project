#version 410

uniform float lightIntensity;
uniform bool blinnPhong;
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
     float ci = pow(eta*eta - (1 - cosangle*cosangle), 0.5);
     float fs = pow((cosangle - ci)/(cosangle + ci), 2);
     float fp = pow((eta*eta*cosangle - ci)/(eta*eta*cosangle + ci), 2);  

     return (fs + fp)/2;
}

float shadowingG(float alpha, float cosangle)
{
     float tan_sqr = (1 - cosangle*cosangle)/(cosangle*cosangle);

     return 2/(1 + sqrt(1 + alpha*alpha + tan_sqr));
}

float NormalDistributionD(float alpha, float cosangle)
{
     float tan_sqr = (1 - cosangle*cosangle)/(cosangle*cosangle); 
     float alpha_sqr = alpha*alpha;
     float pi = 3.14159;

     return (alpha_sqr)/(pi*pow(cosangle, 4)*pow(alpha_sqr*tan_sqr, 2));
}

void main( void )
{    
     float ka = 0.7;
     float kd = 0.6;
     vec4 specular;
     // This is the place where there's work to be done

     float costheta = dot(eyeVector, lightVector);
     vec4 halfvector = normalize(eyeVector + lightVector);
     float F = computefresnel(eta, costheta);

     vec4 ambient = ka*vertColor*lightIntensity;
     vec4 diffuse = kd*vertColor*max(dot(vertNormal, lightVector), 0)*lightIntensity;

     if (blinnPhong)
     {      
          specular = F*vertColor*pow(max(dot(vertNormal, halfvector), 0), shininess)*lightIntensity;
        
          fragColor = ambient + diffuse + specular;
     }

     else
     {
          float alpha = 0.5;
          float cosh = dot(halfvector, vertNormal);
          float cosi = dot(vertNormal, lightVector);
          float coso = dot(vertNormal, eyeVector);

          float D = NormalDistributionD(alpha, cosh);
          float G1i = shadowingG(alpha, cosi);
          float G1o = shadowingG(alpha, coso);

          specular = vertColor*lightIntensity*(F*D*G1i*G1o)/(4*cosi*coso);
          fragColor = ambient + diffuse + specular;
     }
}
