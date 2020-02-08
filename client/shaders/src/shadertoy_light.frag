precision highp float;

struct Obstacle {
    int size;
    int offset;
};

struct Attenuation {
  float constant;
  float linear;
  float exponent;
};

struct PointLight {
    float intensity;
    ivec2 location;
    Attenuation atten;
    vec3 color;
};

struct obstaclePointListT {
	vec2[3] points;
};

struct obstacleListT {
    int size;
    Obstacle[1] obstacles;
};

const obstacleListT obstacleList = obstacleListT(1, Obstacle[](Obstacle(3,0)));
const obstaclePointListT obstaclePointList = obstaclePointListT(vec2[](vec2(100, 200), vec2(150, 200), vec2(250, 300)));




bool onSegment(vec2 p, vec2 q, vec2 r) {
    if (q.x <= max(p.x, r.x) && q.x >= min(p.x, r.x) &&
        q.y <= max(p.y, r.y) && q.y >= min(p.y, r.y))
       return true;

    return false;
}

int orientation(vec2 p, vec2 q, vec2 r) {
    int val = int((q.y - p.y) * (r.x - q.x) -
              (q.x - p.x) * (r.y - q.y));

    if (val == 0) return 0;  // colinear

    return (val > 0)? 1: 2; // clock or counterclock wise
}

bool doIntersect(vec2 p1, vec2 q1, vec2 p2, vec2 q2) {
    // Find the four orientations needed for general and
    // special cases
    int o1 = orientation(p1, q1, p2);
    int o2 = orientation(p1, q1, q2);
    int o3 = orientation(p2, q2, p1);
    int o4 = orientation(p2, q2, q1);

    // General case
    if (o1 != o2 && o3 != o4)
        return true;

    // Special Cases
    // p1, q1 and p2 are colinear and p2 lies on segment p1q1
    if (o1 == 0 && onSegment(p1, p2, q1)) return true;

    // p1, q1 and q2 are colinear and q2 lies on segment p1q1
    if (o2 == 0 && onSegment(p1, q2, q1)) return true;

    // p2, q2 and p1 are colinear and p1 lies on segment p2q2
    if (o3 == 0 && onSegment(p2, p1, q2)) return true;

     // p2, q2 and q1 are colinear and q1 lies on segment p2q2
    if (o4 == 0 && onSegment(p2, q1, q2)) return true;

    return false; // Doesn't fall in any of the above cases
}

bool isPathClear(vec2 start, vec2 end) {
    for (int i = 0; i < obstacleList.size; i ++) {
        int offset = obstacleList.obstacles[i].offset;
        int size = obstacleList.obstacles[i].size;
        for (int j = offset; j < size + offset - 1; j ++) {
            if (doIntersect(start, end, obstaclePointList.points[j], obstaclePointList.points[j + 1])) {
            	return false;
            }
        }
        if (doIntersect(start, end, obstaclePointList.points[offset + size - 1], obstaclePointList.points[offset])) return false;
    }
    return true;
}

const Attenuation atten = Attenuation(.001,10.,.01);
const vec3 lightColor = vec3(255., 230., 163.) / 255.;

const PointLight light1 = PointLight(30.0, ivec2(100,100),atten,lightColor);
const PointLight light2 = PointLight(30.0, ivec2(120,300),atten,lightColor);

const PointLight[2] lights = PointLight[2](light1,light2);

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec4 outLight = vec4(0.0,0.0,0.0,0.0);
    for (int i = 0; i < lights.length(); i ++) {
        PointLight l = lights[i];

        if (isPathClear(fragCoord, vec2(l.location))) {
            vec3 color = l.color;

            vec2 lightDirection = vec2(l.location) - fragCoord;

            float dist = length(lightDirection);

            outLight += vec4(color * l.intensity / (l.atten.linear + l.atten.linear * l.atten.linear + l.atten.exponent * dist * dist + 0.00001), 1.0);
        }
    }
    fragColor = outLight;
}
