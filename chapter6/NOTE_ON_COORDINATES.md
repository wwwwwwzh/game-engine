Y-axis is up, the positive X-axis is right, and the positive Z-axis comes out of the screen towards the viewer. 

Camera looks at its local negative z axis and renders positive z as nearer and positive y as higher. 

![](https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/2X/3/3b9f44fe2faa71ececbe3ab762e3ee6cc388c458.png)
In orbit mode, when dragging to the left, with x delta being negative, you want the camera to look to the left, a negative yaw. when dragging down, y delta is positive, you want camera to look down, positive pitch. So they align. 

In view mode, left means look left, down means look down. So both view and orbit have a convenient `this.yaw += mouseDelta.x; this.pitch += mouseDelta.y;`

![](https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/3D_Spherical.svg/500px-3D_Spherical.svg.png)

Though euler angles or yaw raw pitch can be tricky when defining rotation (local vs global coordinate and ordering), Yaw and pitch can be used to define a direction in a standard way. One way to view the direction is to map them to a spherical coordinate. For this yaw is the phi (azimuth) and pitch is theta (elevation). Another way is to actually rotate a unit direction. You start from positive z and do yaw then pitch with local coordinate of that direction vector. Or you pitch then yaw with global coordinate. Either way you get direction as 
$$x = \cos(\theta) \sin(\psi)$$
$$y = \sin(\theta)$$
$$z = \cos(\theta) \cos(\psi)$$


For our editor camera control to work, we need to use a convention where we start at negative z (yaw pitch = 0 is a direction that looks at neg z). The direction is calculated as 
$$x = \cos(\theta) \sin(\psi)$$
$$y = -\sin(\theta)$$
$$z = -\cos(\theta) \cos(\psi)$$