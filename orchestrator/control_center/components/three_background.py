"""Three.js animated background component for the Holographic Control Center.

This module provides a WebGL particle field background that runs behind
the control center content to create an immersive futuristic atmosphere.
"""

from __future__ import annotations

import streamlit as st
import streamlit.components.v1 as components


def render_three_background() -> None:
    """Render an animated three.js particle background."""
    three_js_html = """
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body, html {
                margin: 0;
                padding: 0;
                overflow: hidden;
                background: #000;
            }
            #three-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                z-index: -1000;
            }
        </style>
    </head>
    <body>
        <div id="three-container"></div>

        <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
        <script>
            // Scene setup
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setClearColor(0x000000, 0);
            document.getElementById('three-container').appendChild(renderer.domElement);

            // Particle system
            const particleCount = 2000;
            const particles = new THREE.BufferGeometry();
            const positions = new Float32Array(particleCount * 3);
            const colors = new Float32Array(particleCount * 3);
            const velocities = new Float32Array(particleCount * 3);

            // Neon color palette
            const neonColors = [
                new THREE.Color(0x00ffff), // cyan
                new THREE.Color(0xff0080), // pink
                new THREE.Color(0x8000ff), // purple
                new THREE.Color(0x00ff41), // green
                new THREE.Color(0x0080ff), // blue
            ];

            // Initialize particles
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;

                // Random positions
                positions[i3] = (Math.random() - 0.5) * 2000;
                positions[i3 + 1] = (Math.random() - 0.5) * 2000;
                positions[i3 + 2] = (Math.random() - 0.5) * 2000;

                // Random velocities
                velocities[i3] = (Math.random() - 0.5) * 2;
                velocities[i3 + 1] = (Math.random() - 0.5) * 2;
                velocities[i3 + 2] = (Math.random() - 0.5) * 2;

                // Random neon colors
                const color = neonColors[Math.floor(Math.random() * neonColors.length)];
                colors[i3] = color.r;
                colors[i3 + 1] = color.g;
                colors[i3 + 2] = color.b;
            }

            particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));

            // Particle material with glow effect
            const particleMaterial = new THREE.PointsMaterial({
                size: 3,
                vertexColors: true,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending,
            });

            const particleSystem = new THREE.Points(particles, particleMaterial);
            scene.add(particleSystem);

            // Grid lines for futuristic feel
            const gridSize = 100;
            const gridDivisions = 50;
            const gridHelper1 = new THREE.GridHelper(gridSize, gridDivisions, 0x00ffff, 0x004444);
            gridHelper1.position.y = -50;
            gridHelper1.material.opacity = 0.3;
            gridHelper1.material.transparent = true;
            scene.add(gridHelper1);

            const gridHelper2 = new THREE.GridHelper(gridSize, gridDivisions, 0xff0080, 0x440044);
            gridHelper2.position.y = -51;
            gridHelper2.rotateY(Math.PI / 2);
            gridHelper2.material.opacity = 0.2;
            gridHelper2.material.transparent = true;
            scene.add(gridHelper2);

            // Floating geometric shapes
            const geometries = [
                new THREE.TetrahedronGeometry(5),
                new THREE.OctahedronGeometry(5),
                new THREE.IcosahedronGeometry(5),
            ];

            const shapes = [];
            for (let i = 0; i < 20; i++) {
                const geometry = geometries[Math.floor(Math.random() * geometries.length)];
                const material = new THREE.MeshBasicMaterial({
                    color: neonColors[Math.floor(Math.random() * neonColors.length)],
                    wireframe: true,
                    transparent: true,
                    opacity: 0.4,
                });

                const shape = new THREE.Mesh(geometry, material);
                shape.position.set(
                    (Math.random() - 0.5) * 200,
                    (Math.random() - 0.5) * 200,
                    (Math.random() - 0.5) * 200
                );
                shape.rotation.set(
                    Math.random() * Math.PI * 2,
                    Math.random() * Math.PI * 2,
                    Math.random() * Math.PI * 2
                );

                shapes.push({
                    mesh: shape,
                    rotationSpeed: {
                        x: (Math.random() - 0.5) * 0.02,
                        y: (Math.random() - 0.5) * 0.02,
                        z: (Math.random() - 0.5) * 0.02,
                    }
                });
                scene.add(shape);
            }

            // Camera position
            camera.position.z = 50;
            camera.position.y = 20;

            // Animation loop
            let time = 0;
            function animate() {
                requestAnimationFrame(animate);
                time += 0.01;

                // Update particles
                const positions = particleSystem.geometry.attributes.position.array;
                for (let i = 0; i < particleCount; i++) {
                    const i3 = i * 3;

                    // Move particles
                    positions[i3] += velocities[i3];
                    positions[i3 + 1] += velocities[i3 + 1];
                    positions[i3 + 2] += velocities[i3 + 2];

                    // Wrap around boundaries
                    if (Math.abs(positions[i3]) > 1000) velocities[i3] *= -1;
                    if (Math.abs(positions[i3 + 1]) > 1000) velocities[i3 + 1] *= -1;
                    if (Math.abs(positions[i3 + 2]) > 1000) velocities[i3 + 2] *= -1;

                    // Add wave motion
                    positions[i3 + 1] += Math.sin(time + i * 0.1) * 0.5;
                }
                particleSystem.geometry.attributes.position.needsUpdate = true;

                // Rotate particle system
                particleSystem.rotation.y += 0.001;
                particleSystem.rotation.x += 0.0005;

                // Animate floating shapes
                shapes.forEach(shape => {
                    shape.mesh.rotation.x += shape.rotationSpeed.x;
                    shape.mesh.rotation.y += shape.rotationSpeed.y;
                    shape.mesh.rotation.z += shape.rotationSpeed.z;

                    // Floating motion
                    shape.mesh.position.y += Math.sin(time + shape.mesh.position.x * 0.01) * 0.1;
                });

                // Camera movement
                camera.position.x = Math.sin(time * 0.1) * 30;
                camera.lookAt(0, 0, 0);

                renderer.render(scene, camera);
            }

            // Handle window resize
            window.addEventListener('resize', () => {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            });

            // Start animation
            animate();
        </script>
    </body>
    </html>
    """

    # Render the component with a small height to not interfere with layout
    components.html(three_js_html, height=0, scrolling=False)


def render_css_particle_background() -> None:
    """Render a lightweight CSS-only particle background as fallback."""
    css_background = """
    <div id="css-particles"></div>
    <style>
    #css-particles {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: -999;
        background:
            radial-gradient(circle at 20% 30%, rgba(0, 255, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(255, 0, 128, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 60% 20%, rgba(128, 0, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 30% 80%, rgba(0, 255, 65, 0.1) 0%, transparent 50%),
            linear-gradient(135deg, #0a0a0a 0%, #1a0a1a 50%, #0a0a1a 100%);
        animation: float 20s ease-in-out infinite;
    }

    #css-particles::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-image:
            radial-gradient(2px 2px at 20px 30px, rgba(0, 255, 255, 0.5), transparent),
            radial-gradient(2px 2px at 40px 70px, rgba(255, 0, 128, 0.5), transparent),
            radial-gradient(1px 1px at 90px 40px, rgba(128, 0, 255, 0.5), transparent),
            radial-gradient(1px 1px at 130px 80px, rgba(0, 255, 65, 0.5), transparent),
            radial-gradient(2px 2px at 160px 30px, rgba(0, 128, 255, 0.5), transparent);
        background-size: 200px 200px;
        animation: sparkle 15s linear infinite;
    }

    @keyframes float {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        33% { transform: translateY(-10px) rotate(1deg); }
        66% { transform: translateY(5px) rotate(-1deg); }
    }

    @keyframes sparkle {
        0% { transform: translateX(0) translateY(0); }
        100% { transform: translateX(-200px) translateY(-200px); }
    }
    </style>
    """

    st.markdown(css_background, unsafe_allow_html=True)
