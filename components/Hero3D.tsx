"use client"

import { Canvas, useFrame } from '@react-three/fiber'
import { Float, MeshDistortMaterial, Sphere, Environment, Stars, Sparkles, MeshTransmissionMaterial, OrbitControls } from '@react-three/drei'
import { useRef, Suspense, useMemo } from 'react'
import * as THREE from 'three'

// Premium "Hyper-Sphere" Design

function Core() {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current) {
      // Pulse effect
      const t = state.clock.elapsedTime
      const scale = 1 + Math.sin(t * 2) * 0.05
      meshRef.current.scale.set(scale, scale, scale)
    }
  })

  return (
    <Sphere ref={meshRef} args={[0.8, 64, 64]}>
      <meshStandardMaterial 
        color="#a3e635"
        emissive="#ccff00"
        emissiveIntensity={2}
        toneMapped={false}
      />
    </Sphere>
  )
}

function LiquidMetalLayer() {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.2
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3
    }
  })

  return (
    <Sphere ref={meshRef} args={[1.2, 128, 128]}>
      <MeshDistortMaterial
        color="#1a1a1a"
        metalness={1}
        roughness={0.1}
        distort={0.5}
        speed={1.5}
      />
    </Sphere>
  )
}

function GlassShell() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = -state.clock.elapsedTime * 0.1
    }
  })

  return (
    <Sphere ref={meshRef} args={[1.6, 64, 64]}>
      <MeshTransmissionMaterial
        backside
        thickness={0.2}
        roughness={0}
        transmission={1}
        ior={1.5}
        chromaticAberration={1} // High dispersion for rainbow effects
        anisotropy={0.5}
        distortion={0.2}
        distortionScale={0.5}
        temporalDistortion={0.1}
        attenuationDistance={0.5}
        attenuationColor="#ffffff"
        color="#ffffff"
        background={new THREE.Color('#000000')}
      />
    </Sphere>
  )
}

function OrbitalRing({ radius, speed, color, rotation }: { radius: number, speed: number, color: string, rotation: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.z += speed
    }
  })

  return (
    <group rotation={rotation}>
      <mesh ref={ref}>
        <torusGeometry args={[radius, 0.005, 16, 100]} />
        <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={1} color="#a3e635" />
      
      {/* Shift entire scene down to avoid navbar overlap */}
      <group position={[0.4, -0.3, 0]}>
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
          <group scale={1.0}> {/* Scaled down slightly */}
            <Core />
            <LiquidMetalLayer />
            <GlassShell />
          </group>
        </Float>

        {/* Elegant thin orbits - Reduced sizes to fit page better */}
        <OrbitalRing radius={2.0} speed={0.005} color="#a3e635" rotation={[1, 0.5, 0]} />
        <OrbitalRing radius={2.5} speed={-0.003} color="#c084fc" rotation={[0.5, -0.5, 0]} />
        <OrbitalRing radius={3.0} speed={0.002} color="#ffffff" rotation={[-0.5, 1, 0]} />
        <OrbitalRing radius={2.6} speed={0.004} color="#144f9bff" rotation={[-1, 0.5, 0]} />
        
        {/* Atmospheric Particles */}
        <Sparkles 
          count={100} 
          scale={5} 
          size={2} 
          speed={0.4} 
          opacity={0.5} 
          color="#a3e635"
        />
        <Sparkles 
          count={30} 
          scale={7} 
          size={3} 
          speed={0.2} 
          opacity={0.3} 
          color="#c084fc"
        />
      </group>

      <Environment preset="city" />
    </>
  )
}

export function Hero3D() {
  return (
    <div className="absolute inset-0 w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 9], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]} // Support high DPI
      >
        <Suspense fallback={null}>
          <Scene />
          <OrbitControls 
            enableZoom={false} 
            enablePan={false} 
            autoRotate 
            autoRotateSpeed={0.5}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 1.5}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}

export default Hero3D
