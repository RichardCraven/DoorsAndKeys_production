import React, {useState, useEffect} from 'react'
import { useSpring, animated } from 'react-spring'

import {registerRequest} from '../utils/api-handler';
import { FEATURE_FLAGS } from '../utils/feature-flags';
import { LANDING_REDUX_CSS } from '../styles/landing-redux-css';

export default function LoginPage(props) {
  
  const [paneToggle, setPane] = useState(null)
  
  useEffect(() => {
    if (FEATURE_FLAGS.landingRedux) {
      const styleId = 'landing-redux-injected-styles';
      let styleEl = document.getElementById(styleId);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.textContent = LANDING_REDUX_CSS;
        document.head.appendChild(styleEl);
      }
      return () => {
        const el = document.getElementById(styleId);
        if (el) el.remove();
      };
    }
  }, []);

  useEffect(() => {
    if (FEATURE_FLAGS.landingRedux && paneToggle === null) {
      setPane('login');
    }
  }, [paneToggle]);

  const [registerName, setRegName] = useState('')
  const [registerPass1, setRegPass1] = useState('')
  const [registerPass2, setRegPass2] = useState('')
  const [loginName, setLogName] = useState('')
  const [loginPass, setLogPass] = useState('')
  const [invalidCredentials, setInvalid] = useState(false)

  const [loginInputPropsName, setLname] = useSpring(() => ({ x: '-200px', opacity: 0, config: { mass: 5, tension: 350, friction: 40 } }))
  const [loginInputPropsPass, setLpass] = useSpring(() => ({ x: '-200px', opacity: 0, config: { mass: 5, tension: 350, friction: 40 } }))
  
  const [registrationInputPropsName, setRname] = useSpring(() => ({ x: '200px', opacity: 0, config: { mass: 3, tension: 350, friction: 40 } }))
  const [registrationInputPropsPass1, setRpass1] = useSpring(() => ({ x: '200px', opacity: 0, config: { mass: 6, tension: 350, friction: 40 } }))
  const [registrationInputPropsPass2, setRpass2] = useSpring(() => ({ x: '200px', opacity: 0, config: { mass: 5, tension: 250, friction: 40 } }))
  
  const [successConfirmation, setSuccessConfirmation] = useSpring(() => ({ x: '200px', opacity: 0, config: { mass: 5, tension: 350, friction: 40 } }))
  useEffect(() => {
    const handleKey = (e) => {
      if(e.key && e.key.toLowerCase() === 'enter'){
          if(loginName.length > 0 && loginPass.length > 0){
              const success = props.login({username: loginName, password:loginPass})
              if (!success) {
                setInvalid(true);
              }
        }
      }
    }

    document.addEventListener("keydown", handleKey, false);
    return () => {
        document.removeEventListener("keydown", handleKey);
    }
  },[paneToggle, loginName, loginPass, props])

  



  const handleChange = (e, type) => {
    // Clear error when user starts typing
    if (invalidCredentials) {
      setInvalid(false);
    }
    switch(type){
      case 'register-name':
       setRegName(e.target.value)
      break;
      case 'login-name':
       setLogName(e.target.value)
      break;
      case 'register-password1':
       setRegPass1(e.target.value)
      break;
      case 'register-password2':
       setRegPass2(e.target.value)
      break;
      case 'login-password':
       setLogPass(e.target.value)
      break;
      default:
       break;
    }
  }

  const handleClick = async (type) => {
    setInvalid(false);
    switch(type){
      case 'login':
        if(paneToggle !== 'login'){
          setLname({x: '0px', opacity: 1})
          setTimeout(() => {
            setLpass({x: '0px', opacity: 1})
          }, 90)

          setRname({x: '200px', opacity: 0})
          setTimeout(() => {
            setRpass1({x: '200px', opacity: 0})

            setRpass2({x: '200px', opacity: 0})
          }, 90)
          setPane('login')
        } else if(loginName.length > 0 && loginPass.length > 0){
              const success = props.login({username: loginName, password:loginPass})
              if (!success) {
                setInvalid(true);
              }
        }
      break;
      case 'register':
        if(paneToggle !== 'register'){
          setLname({x: '-200px', opacity: 0})
          setTimeout(() => {
            setLpass({x: '-200px', opacity: 0})
          }, 90)

          setRname({x: '0px', opacity: 1})
          setTimeout(() => {
            setRpass1({x: '0px', opacity: 1})

            setRpass2({x: '0px', opacity: 1})
          }, 90)
          setPane('register')
        } else {
          if(registerPass1 !== registerPass2){
            alert('passwords must match')
          } else if(registerPass1.length > 0){
            const metadata = {
              dungeonId: null,
              boardIndex: null,
              tileIndex: null,
              crew: null,
              inventory: null
            }
            const registerResponse = await registerRequest({username: registerName, password: registerPass1, isAdmin: true, metadata: JSON.stringify(metadata)})
            if(registerResponse.status === 200){
              const registerRes = {
                _id: registerResponse.data._id,
                // token: registerResponse.data.token,
                isAdmin: registerResponse.data.isAdmin,
                metadata: registerResponse.data.metadata,
                username: registerName,
                password: registerPass1
              }
              showRegistrationConfirmation(registerRes)

            } else {
              console.log('something failed', registerResponse)
              // alert('something failed', registerResponse)
            }
          }
        }
      break;
      case null:
        setLname({x: '-200px', opacity: 0})
        setLpass({x: '-200px', opacity: 0})

        setRname({x: '200px', opacity: 0})
        setRpass1({x: '200px', opacity: 0})
        setRpass2({x: '200px', opacity: 0})

        setPane(null)
      break;
      default:
      break;
    }
  }

  const showRegistrationConfirmation = (registerRes) => {
    // setInvalid(false);
    

    // setLname({x: '0px', opacity: 1})
    // setTimeout(() => {
    //   setLpass({x: '0px', opacity: 1})
    // }, 90)

    setSuccessConfirmation({x: '0px', opacity: 1})
    setTimeout(() => {
      setRname({x: '-200px', opacity: 0})
      setRpass1({x: '-200px', opacity: 0})
      setRpass2({x: '-200px', opacity: 0})

      setPane('confirmation')
    }, 90)

    props.refreshAllUsers()
    setTimeout(()=>{
      // setSuccessConfirmation({x: '200px', opacity: 0})

      // setLname({x: '0px', opacity: 1})
      //     setTimeout(() => {
      //       setLpass({x: '0px', opacity: 1})
      //     }, 90)
      // props.login({username: registerName, password:registerPass1})
      props.loginFromRegister(registerRes)
    },1500)

  }
  if (FEATURE_FLAGS.landingRedux) {
    return (
      <div className="redux-login-container">
        <div className="login-card">
          <div className="title-glowing">
            Dream Tower
          </div>

          {paneToggle !== 'confirmation' && (
            <div className="tabs">
              <button
                className={`tab ${paneToggle === 'login' ? 'active' : ''}`}
                onClick={() => setPane('login')}
                type="button"
              >
                Login
              </button>
              <button
                className={`tab ${paneToggle === 'register' ? 'active' : ''}`}
                onClick={() => setPane('register')}
                type="button"
              >
                Register
              </button>
            </div>
          )}

          {invalidCredentials && (
            <div className="error-banner">
              ⚠️ Invalid credentials. Please try again.
            </div>
          )}

          {paneToggle === 'login' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleClick('login');
              }}
              style={{ width: '100%' }}
            >
              <div className="form-inputs">
                <div className="input-wrapper">
                  <span className="input-icon">👤</span>
                  <input
                    value={loginName}
                    autoComplete="username"
                    type="text"
                    placeholder="Enter name"
                    onChange={(e) => handleChange(e, 'login-name')}
                  />
                </div>
                <div className="input-wrapper">
                  <span className="input-icon">🔑</span>
                  <input
                    value={loginPass}
                    autoComplete="current-password"
                    type="password"
                    placeholder="Enter password"
                    onChange={(e) => handleChange(e, 'login-password')}
                  />
                </div>
              </div>
              <button className="btn-submit" type="submit">Enter Dungeon</button>
            </form>
          )}

          {paneToggle === 'register' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleClick('register');
              }}
              style={{ width: '100%' }}
            >
              <div className="form-inputs">
                <div className="input-wrapper">
                  <span className="input-icon">👤</span>
                  <input
                    value={registerName}
                    autoComplete="username"
                    type="text"
                    placeholder="Choose name"
                    onChange={(e) => handleChange(e, 'register-name')}
                  />
                </div>
                <div className="input-wrapper">
                  <span className="input-icon">🔑</span>
                  <input
                    value={registerPass1}
                    autoComplete="new-password"
                    type="password"
                    placeholder="Choose password"
                    onChange={(e) => handleChange(e, 'register-password1')}
                  />
                </div>
                <div className="input-wrapper">
                  <span className="input-icon">🔒</span>
                  <input
                    value={registerPass2}
                    autoComplete="new-password"
                    type="password"
                    placeholder="Repeat password"
                    onChange={(e) => handleChange(e, 'register-password2')}
                  />
                </div>
              </div>
              <button className="btn-submit" type="submit">Register Account</button>
            </form>
          )}

          {paneToggle === 'confirmation' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🎉</div>
              <h4 style={{ color: '#e5b54f', fontFamily: 'Cinzel', marginBottom: '10px' }}>
                Account Created!
              </h4>
              <p style={{ color: '#a8a29e', fontSize: '0.9rem' }}>
                Preparing your descent...
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div>
        <div className="login-pane pane">
          {paneToggle === null && 
            <div
              style={{
                position: 'absolute',
                top: '40%'
              }}
              className="doors-and-keys-title"
            >Doors and Keys</div>
          }
          <div className="inputs-container-row">
            <div className="absolute-wrapper" style={{
                pointerEvents: paneToggle === 'login' ? 'auto' : 'none'
              }}>
              <form action="">
                <div className="inputs-container">  
                      <animated.div style={{
                        transform: loginInputPropsName.x.interpolate((x) => `translate3d(${x},0,0)`),
                        opacity: loginInputPropsName.opacity,
                        transition: 'opacity 0.1s'
                        }}>
                        <input value={loginName} autoComplete="none" type="text" placeholder="Name" onChange={(e) => {handleChange(e, 'login-name')}}/>
                      </animated.div>
                      <animated.div style={{
                        transform: loginInputPropsPass.x.interpolate((x) => `translate3d(${x},0,0)`),
                        opacity: loginInputPropsPass.opacity,
                        transition: 'opacity 0.1s'
                        }}>
                        <input value={loginPass} autoComplete="current-password" type="password" placeholder="Password" onChange={(e) => {handleChange(e, 'login-password')}}/>
                      </animated.div>
                </div>
              </form>
            </div>
            <div className="absolute-wrapper" style={{
                pointerEvents: paneToggle === 'register' ? 'auto' : 'none'
              }}>
              <form action="">
                <div className="inputs-container">
                  <animated.div style={{
                      transform: registrationInputPropsName.x.interpolate((x) => `translate3d(${x},0,0)`),
                      opacity: registrationInputPropsName.opacity,
                      transition: 'opacity 0.1s'
                      }}>
                      <input value={registerName} autoComplete="none" type="text" placeholder="Name" onChange={(e) => {handleChange(e, 'register-name')}}/>
                  </animated.div>
                  <animated.div style={{
                      transform: registrationInputPropsPass1.x.interpolate((x) => `translate3d(${x},0,0)`),
                      opacity: registrationInputPropsPass1.opacity,
                      transition: 'opacity 0.1s'
                      }}>
                      <input value={registerPass1} autoComplete="current-password" type="password" placeholder="Password" onChange={(e) => {handleChange(e, 'register-password1')}}/>
                  </animated.div>
                  <animated.div style={{
                      transform: registrationInputPropsPass2.x.interpolate((x) => `translate3d(${x},0,0)`),
                      opacity: registrationInputPropsPass2.opacity,
                      transition: 'opacity 0.1s'
                      }}>
                      <input value={registerPass2} autoComplete="current-password" type="password" placeholder="Repeat password" onChange={(e) => {handleChange(e, 'register-password2')}}/>
                  </animated.div>
                </div>   
                
              </form>
            </div>
            <div className="absolute-wrapper" style={{
                pointerEvents: paneToggle === 'confirmation' ? 'auto' : 'none'
              }}>
              <div className="confirmation-container">
                <animated.div style={{
                    transform: successConfirmation.x.interpolate((x) => `translate3d(${x},0,0)`),
                    opacity: successConfirmation.opacity,
                    transition: 'opacity 0.1s'
                    }}>
                    <div>SUCCESS</div>
                </animated.div>
              </div>  
            </div>
          </div>
          {invalidCredentials && 
                  <div className="invalid-credentials">
                    Invalid Credentials
                  </div>
          }
          <div className="buttons-bar">
              {paneToggle === null && <div className="space-around">
                <button className="login-button button" onClick={() => handleClick('login')}>Login</button>
                <button className="register-button button" onClick={() => handleClick('register')}>Register</button>
              </div>}
              {paneToggle === 'login' && 
                <animated.div className="space-around" style={{
                transform: loginInputPropsName.x.interpolate((x) => `translate3d(${x},0,0)`),
                opacity: loginInputPropsName.opacity,
                transition: 'opacity 0.1s'
                }}>
                  <button className="back-button button" onClick={() => handleClick(null)}>Back</button>
                  <button className="login-button button" onClick={() => handleClick('login')}>Submit</button>
                </animated.div>
              }
              {paneToggle === 'register' && 
                <animated.div className="space-around" style={{
                  transform: registrationInputPropsName.x.interpolate((x) => `translate3d(${x},0,0)`),
                  opacity: registrationInputPropsName.opacity,
                  transition: 'opacity 0.1s'
                  }}>
                  <button className="back-button button" onClick={() => handleClick(null)}>Back</button>
                  <button className="register-button button" onClick={() => handleClick('register')}>Submit</button>
                </animated.div>
              }
          </div>
        </div>
      </div>
    </div>
  )
}