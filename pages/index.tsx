import type { NextPage } from 'next'
import React, { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import styles from '../styles/Home.module.css'
import OBSWebSocket from 'obs-websocket-js'

import { useSession } from "next-auth/react"

const loadingSpinner = '../spinning-circles.svg'

function useInterval(callback, delay) {
  const savedCallback = useRef();

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    function tick() {
      savedCallback.current();
    }
    if (delay !== null) {
      let id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

const Home: NextPage = () => {
  const { data: session } = useSession()

  const [previewSrc, setPreviewSrc] = useState(loadingSpinner);
  const [socket, setSocket] = useState(null);
  const [OBSURL, setOBSURL] = useState('ws://127.0.0.1:4455');
  const [OBSPassword, setOBSPassword] = useState('');
  const [OBSError, setOBSError] = useState(null);

  const [OBSSceneCollection, setOBSSceneCollection] = useState("");
  const [CurrentSceneCollection, setCurrentSceneCollection] = useState("");

  const [displayPreview, setDisplayPreview] = useState(true);

  const resetOBS = () => {
    setPreviewSrc(loadingSpinner);
  }

  const getImage = async (obs) => {
      if (obs && displayPreview && !OBSError) {
          const { currentProgramSceneName: scene } = await obs.call('GetCurrentProgramScene');
          const { imageData } = await obs.call('GetSourceScreenshot', {sourceName: scene, imageFormat: 'png'})
          setPreviewSrc(imageData)
      }
  }

  useEffect(() => {
    const connectOBS = async (obs) => {
        try {
            await obs.disconnect()
            await obs.connect(OBSURL, OBSPassword)
            setOBSError(null)
        } catch (e) {
            setOBSError(e) 
            resetOBS();
        }
    }

    if (socket) {
        (async () => { await socket.disconnect() })();
    }

    if (OBSURL && OBSPassword) {
      const obs = socket || new OBSWebSocket();

      obs.off('Identified')
      obs.on('Identified', () => {
        setSocket(obs)
        setOBSError(null);
        obs.call('GetSceneCollectionList').then(({ currentSceneCollectionName }) => setCurrentSceneCollection(currentSceneCollectionName))
	getImage(obs)
      })

      obs.off('ConnectionClosed')
      obs.on('ConnectionClosed', (error) => {
        setSocket(null);
        setOBSError(error);
        resetOBS();
      })

      obs.off('CurrentSceneCollectionChanged')
      obs.on('CurrentSceneCollectionChanged', ({ sceneCollectionName }) => setCurrentSceneCollection(sceneCollectionName))

      connectOBS(obs)
    }
  }, [OBSURL, OBSPassword])

  useInterval(() => {
    getImage(socket)
  }, 1000)

  return (
    <div className={styles.container}>
      <Head>
        <title>Restream Dashboard</title>
      </Head>

      <h1 className={styles.title}>Restream Dashboard</h1>

      <main className={styles.main}>
        { displayPreview && <div className={styles.preview}><img src={previewSrc} /></div> }
        <div className={styles.grid}>
          {session && <div className={styles.card}>Signed in as <img style={{height: "1rem"}} src={session.user.image} /> {session.user.full_username}.</div>}
          <div className={styles.card}>
            <label for="OBSURL">OBS Websocket URL</label> <input name="OBSURL" value={OBSURL} onChange={(e) => setOBSURL(e.target.value)} /><br />
            <label for="OBSPassword">OBS Websocket Password</label> <input name="OBSPassword" type="password" value={OBSPassword} onChange={(e) => setOBSPassword(e.target.value)} /><br />
            { OBSError && <span style={{color: 'red'}}>{OBSError.toString()}</span> }
            <br />
            <label for="SceneCollection" style={{color: (CurrentSceneCollection === OBSSceneCollection ? 'black' : 'red')}}>Scene Collection (current: {CurrentSceneCollection})</label> <input name="SceneCollection" value={OBSSceneCollection} onChange={(e) => setOBSSceneCollection(e.target.value)} /><br />
          </div>
          <a className={styles.card} onClick={function() {setDisplayPreview(!displayPreview)}}><h2>Toggle Preview</h2></a>
          <Link href="/test"><a className={styles.card}>
            <h2>Test</h2>
            <p>This is a test card using a Link</p>
          </a></Link>
        </div>
      </main>

      <footer className={styles.footer}>
        <a href="https://github.com/ianmcorvidae/autorestream">GitHub</a>
      </footer>
    </div>
  )
}

export default Home
