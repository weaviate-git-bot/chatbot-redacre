import React, { useState } from 'react';
import './App.css';

import { initializeApp } from "firebase/app";
import { useAuthState } from 'react-firebase-hooks/auth';
import { GoogleAuthProvider, getAuth, signInWithPopup } from 'firebase/auth';
import { getFirestore, collection, orderBy, limit, query, addDoc } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore'
import { Question, messageProps } from './questions';

const firebaseConfig = {
  apiKey: "AIzaSyDiahgYqtFn4laL766h-dryzuxUXQbY76k",
  authDomain: "chatbot-redacre.firebaseapp.com",
  projectId: "chatbot-redacre",
  storageBucket: "chatbot-redacre.appspot.com",
  messagingSenderId: "805476528480",
  appId: "1:805476528480:web:1ab1019b5cd0697ff0ee05",
  measurementId: "G-8ZSJF8VGEK"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const firestore = getFirestore(app);

function App() {
  const [user] = useAuthState(auth);

  return (
    <div className="App">
      <header className="App-header">
        <SignOut/>
      </header>

      <section>
        {user ? <ChatRoom /> : <SignIn />}
      </section>
    </div>
  );
}

function SignIn() {
  const signInWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider);
  }

  return (
    <>
      <button className="sign-in" onClick={signInWithGoogle}>Sign in with Google</button>
    </>
  )

}

function SignOut() {
  return auth.currentUser && (
    <button className="sign-out" onClick={() => auth.signOut()}>Sign Out</button>
  )
}


function ChatRoom() {
  const questionsRef = collection(firestore, 'questions');
  const q = query(questionsRef, limit(25), orderBy('createdAt'))

  const [snapshot, loading, error] = useCollection(q, {snapshotListenOptions: { includeMetadataChanges: true }});
  const [formValue, setFormValue] = useState('');


  const sendMessage = async (e: any) => {
    e.preventDefault();
    if(auth.currentUser){
      const { uid, photoURL }= auth.currentUser;

      await addDoc(questionsRef, {
        question: formValue,
        createdAt: new Date(),
        userId: uid,
        userPic: photoURL
      } as Question)

      setFormValue('');
    }
  }

  return (<>
    {error && <strong>Error: {JSON.stringify(error)}</strong>}
    {loading && <span>Loading previous discussion...</span>}
    {snapshot && (
      <main>
        {snapshot && snapshot.docs.map(question => <ChatMessage key={question.id} question={question.data() as Question} />)}
      </main>
    )}

    <form onSubmit={sendMessage}>
      <input value={formValue} onChange={(e) => setFormValue(e.target.value)} placeholder="How can we help" />
      <button type="submit" disabled={(snapshot?.docs.at(-1)?.data() as Question)?.response == undefined}>🕊️</button>
    </form>
  </>)
}


function ChatMessage(props: messageProps) {
  const { question, response, userPic, userId } = props.question;

  return (<>
    <div>
      <img width="50" height="50" src={userPic || "https://api.dicebear.com/6.x/adventurer/svg?seed=Midnight"} alt="avatar"/>
      <p>{question}</p>
      <img width="50" height="50" src="https://api.dicebear.com/6.x/bottts/svg?seed=Kiki" alt="avatar"/>
      {response ? <p>{response}</p> : <div className="typing"><span></span><span></span><span></span></div>}
    </div>
  </>)
}


export default App;