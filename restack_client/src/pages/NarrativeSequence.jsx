import React, {useState, useEffect, useRef} from 'react'

import { Redirect } from "react-router-dom";

// import schematic from "../assets/high_res_images/mj_graphics/schematics/schematic 1.png";
// import doorSequence1 from "../assets/high_res_images/mj_graphics/doorway/d1.png";
// import doorSequence2 from "../assets/high_res_images/mj_graphics/doorway/d2.png";
// import doorSequence3 from "../assets/high_res_images/mj_graphics/doorway/d3.png";

import Typewriter from "../utils/typewriter";

// INTRO scene 1
import darkForest1 from '../assets/high_res_images/mj_graphics/intro/1_in a dark forest/darkForest1.png'
import darkForest2 from '../assets/high_res_images/mj_graphics/intro/1_in a dark forest/darkForest2.png'
import darkForest3 from '../assets/high_res_images/mj_graphics/intro/1_in a dark forest/darkForest3.png'
import darkForest4 from '../assets/high_res_images/mj_graphics/intro/1_in a dark forest/darkForest4.png'
import darkForest5 from '../assets/high_res_images/mj_graphics/intro/1_in a dark forest/darkForest5.png'
import darkForest6 from '../assets/high_res_images/mj_graphics/intro/1_in a dark forest/darkForest6.png'

// INTRO scene 2
import crudeMap1 from '../assets/high_res_images/mj_graphics/intro/2_a map was found/crude map 1.png'
import crudeMap3 from '../assets/high_res_images/mj_graphics/intro/2_a map was found/crude map 3.png'

// INTRO scene 3
import braveSouls1 from '../assets/high_res_images/mj_graphics/intro/3_brave souls embark/brave souls 1.png'
import braveSouls2 from '../assets/high_res_images/mj_graphics/intro/3_brave souls embark/brave souls 2.png'
import braveSouls3 from '../assets/high_res_images/mj_graphics/intro/3_brave souls embark/brave souls 3.png'
import braveSouls4 from '../assets/high_res_images/mj_graphics/intro/3_brave souls embark/brave souls 4.png'
import braveSouls5 from '../assets/high_res_images/mj_graphics/intro/3_brave souls embark/brave souls 5.png'

// INTRO scene 4
import encounter1 from '../assets/high_res_images/mj_graphics/intro/4_encounter a tower/encounter 1.png'
import encounter2 from '../assets/high_res_images/mj_graphics/intro/4_encounter a tower/encounter 2.png'
import encounter3 from '../assets/high_res_images/mj_graphics/intro/4_encounter a tower/encounter 3.png'

// INTRO scene 5
import passage1 from '../assets/high_res_images/mj_graphics/intro/5_a passage down/passage down 1.png'
import passage2 from '../assets/high_res_images/mj_graphics/intro/5_a passage down/passage down 2.png'
import passage3 from '../assets/high_res_images/mj_graphics/intro/5_a passage down/passage down 3.png'
import passage4 from '../assets/high_res_images/mj_graphics/intro/5_a passage down/passage down 4.png'
import passage5 from '../assets/high_res_images/mj_graphics/intro/5_a passage down/passage down 5.png'
import passage6 from '../assets/high_res_images/mj_graphics/intro/5_a passage down/passage down 6.png'

// INTRO scene 6
import ancientDoorway1 from '../assets/high_res_images/mj_graphics/intro/6_a doorway/door 1.png'
import ancientDoorway2 from '../assets/high_res_images/mj_graphics/intro/6_a doorway/door 2.png'
import ancientDoorway3 from '../assets/high_res_images/mj_graphics/intro/6_a doorway/door 3.png'
import ancientDoorway4 from '../assets/high_res_images/mj_graphics/intro/6_a doorway/door 4.png'
import ancientDoorway5 from '../assets/high_res_images/mj_graphics/intro/6_a doorway/door 5.png'

import ancientDoorway6 from '../assets/high_res_images/mj_graphics/intro/6_an ancient doorway/ancient doorway 1.png'
import ancientDoorway7 from '../assets/high_res_images/mj_graphics/intro/6_an ancient doorway/ancient doorway 2.png'
import ancientDoorway8 from '../assets/high_res_images/mj_graphics/intro/6_an ancient doorway/ancient doorway 3.png'
import ancientDoorway9 from '../assets/high_res_images/mj_graphics/intro/6_an ancient doorway/ancient doorway 4.png'
import ancientDoorway10 from '../assets/high_res_images/mj_graphics/intro/6_an ancient doorway/ancient doorway 5.png'


// DEATH scene 1
import deathScene1 from '../assets/high_res_images/mj_graphics/death/death_1.jpg'
import deathScene2 from '../assets/high_res_images/mj_graphics/death/death_2.jpg'
import deathScene3 from '../assets/high_res_images/mj_graphics/death/death_3.jpg'
import deathScene4 from '../assets/high_res_images/mj_graphics/death/death_4.jpg'
import deathScene5 from '../assets/high_res_images/mj_graphics/death/death_5.jpg'
import deathScene6 from '../assets/high_res_images/mj_graphics/death/death_6.jpg'
import deathScene7 from '../assets/high_res_images/mj_graphics/death/death_7.jpg'
import deathScene8 from '../assets/high_res_images/mj_graphics/death/death_8.jpg'
import deathScene9 from '../assets/high_res_images/mj_graphics/death/death_9.jpg'
import deathScene10 from '../assets/high_res_images/mj_graphics/death/death_10.jpg'
import deathScene11 from '../assets/high_res_images/mj_graphics/death/death_11.jpg'
import deathScene12 from '../assets/high_res_images/mj_graphics/death/death_12.jpg'
import deathScene13 from '../assets/high_res_images/mj_graphics/death/death_13.jpg'
import deathScene14 from '../assets/high_res_images/mj_graphics/death/death_14.jpg'
import deathScene15 from '../assets/high_res_images/mj_graphics/death/death_15.jpg'
import deathScene16 from '../assets/high_res_images/mj_graphics/death/death_16.jpg'
import deathScene17 from '../assets/high_res_images/mj_graphics/death/death_17.jpg'
import deathScene18 from '../assets/high_res_images/mj_graphics/death/death_18.jpg'
import deathScene19 from '../assets/high_res_images/mj_graphics/death/death_19.jpg'
import deathScene20 from '../assets/high_res_images/mj_graphics/death/death_20.jpg'
import deathScene21 from '../assets/high_res_images/mj_graphics/death/death_21.jpg'
import deathScene22 from '../assets/high_res_images/mj_graphics/death/death_22.jpg'
import deathScene23 from '../assets/high_res_images/mj_graphics/death/death_23.jpg'
import deathScene24 from '../assets/high_res_images/mj_graphics/death/death_24.jpg'
import deathScene25 from '../assets/high_res_images/mj_graphics/death/death_25.jpg'
import deathScene26 from '../assets/high_res_images/mj_graphics/death/death_26.jpg'
import deathScene27 from '../assets/high_res_images/mj_graphics/death/death_27.jpg'
import deathScene28 from '../assets/high_res_images/mj_graphics/death/death_28.jpg'
import deathScene29 from '../assets/high_res_images/mj_graphics/death/death_29.jpg'
import deathScene30 from '../assets/high_res_images/mj_graphics/death/death_30.jpg'
import deathScene31 from '../assets/high_res_images/mj_graphics/death/death_31.jpg'
import deathScene32 from '../assets/high_res_images/mj_graphics/death/death_32.jpg'
import deathScene33 from '../assets/high_res_images/mj_graphics/death/death_33.jpg'
import deathScene34 from '../assets/high_res_images/mj_graphics/death/death_34.jpg'
import deathScene35 from '../assets/high_res_images/mj_graphics/death/death_35.jpg'
import deathScene36 from '../assets/high_res_images/mj_graphics/death/death_36.jpg'
import deathScene37 from '../assets/high_res_images/mj_graphics/death/death_37.jpg'
import deathScene38 from '../assets/high_res_images/mj_graphics/death/death_38.jpg'
import deathScene39 from '../assets/high_res_images/mj_graphics/death/death_39.jpg'
import deathScene40 from '../assets/high_res_images/mj_graphics/death/death_40.jpg'
import deathScene41 from '../assets/high_res_images/mj_graphics/death/death_41.jpg'
import deathScene42 from '../assets/high_res_images/mj_graphics/death/death_42.jpg'
import deathScene43 from '../assets/high_res_images/mj_graphics/death/death_43.jpg'
import deathScene44 from '../assets/high_res_images/mj_graphics/death/death_44.jpg'
import deathScene45 from '../assets/high_res_images/mj_graphics/death/death_45.jpg'
import deathScene46 from '../assets/high_res_images/mj_graphics/death/death_46.jpg'
import deathScene47 from '../assets/high_res_images/mj_graphics/death/death_47.jpg'
import deathScene48 from '../assets/high_res_images/mj_graphics/death/death_48.jpg'
import deathScene49 from '../assets/high_res_images/mj_graphics/death/death_49.jpg'
import deathScene50 from '../assets/high_res_images/mj_graphics/death/death_50.jpg'
import deathScene51 from '../assets/high_res_images/mj_graphics/death/death_51.jpg'
import deathScene52 from '../assets/high_res_images/mj_graphics/death/death_52.jpg'
import deathScene53 from '../assets/high_res_images/mj_graphics/death/death_53.jpg'
import deathScene54 from '../assets/high_res_images/mj_graphics/death/death_54.jpg'
import deathScene55 from '../assets/high_res_images/mj_graphics/death/death_55.jpg'
import deathScene56 from '../assets/high_res_images/mj_graphics/death/death_56.jpg'
import deathScene57 from '../assets/high_res_images/mj_graphics/death/death_57.jpg'
import deathScene58 from '../assets/high_res_images/mj_graphics/death/death_58.jpg'
import deathScene59 from '../assets/high_res_images/mj_graphics/death/death_59.jpg'
import deathScene60 from '../assets/high_res_images/mj_graphics/death/death_60.jpg'
import deathScene61 from '../assets/high_res_images/mj_graphics/death/death_61.jpg'
import deathScene63 from '../assets/high_res_images/mj_graphics/death/death_63.jpg'
import deathScene64 from '../assets/high_res_images/mj_graphics/death/death_64.jpg'
import deathScene65 from '../assets/high_res_images/mj_graphics/death/death_65.jpg'
import deathScene66 from '../assets/high_res_images/mj_graphics/death/death_66.jpg'
import deathScene67 from '../assets/high_res_images/mj_graphics/death/death_67.jpg'
import deathScene68 from '../assets/high_res_images/mj_graphics/death/death_68.jpg'
import deathScene69 from '../assets/high_res_images/mj_graphics/death/death_69.jpg'
import deathScene70 from '../assets/high_res_images/mj_graphics/death/death_70.jpg'
import deathScene71 from '../assets/high_res_images/mj_graphics/death/death_71.jpg'
import deathScene72 from '../assets/high_res_images/mj_graphics/death/death_72.jpg'
import deathScene73 from '../assets/high_res_images/mj_graphics/death/death_73.jpg'
import deathScene74 from '../assets/high_res_images/mj_graphics/death/death_74.jpg'
import deathScene75 from '../assets/high_res_images/mj_graphics/death/death_75.jpg'
import deathScene76 from '../assets/high_res_images/mj_graphics/death/death_76.jpg'
import deathScene77 from '../assets/high_res_images/mj_graphics/death/death_77.jpg'
import deathScene78 from '../assets/high_res_images/mj_graphics/death/death_78.jpg'
import deathScene79 from '../assets/high_res_images/mj_graphics/death/death_79.jpg'
import deathScene80 from '../assets/high_res_images/mj_graphics/death/death_80.jpg'
import deathScene81 from '../assets/high_res_images/mj_graphics/death/death_81.jpg'

export default function NarrativeSequence(props) {

    const pickRandom = (array) => {
        let index = Math.floor(Math.random() * array.length)
        return array[index]
    }
    const [fadeInFirstFrame, setFadeInFirstFrame] = useState(false)
    const [fadeOutLastFrame, setFadeOutLastFrame] = useState(false)
    const [navToDungeon, setNavToDungeon] = useState(false)
    const [navToLanding, setNavToLanding] = useState(false)
    const [currentSequence, setCurrentSequence] = useState(null)

    const [currentOddSequence, setCurrentOddSequence] = useState(null)
    const [currentEvenSequence, setCurrentEvenSequence] = useState(null)

    const [wreckImage, setWreckImage] = useState(false)
    const [moreWrecked, setMoreWrecked] = useState(false)

    // in the deep of a starless night
    const darkForest = [darkForest1, darkForest2, darkForest3, darkForest4, darkForest5, darkForest6]
    // an old map was found
    const oldMap = [crudeMap1, crudeMap3]
    // a three brave souls set out 
    const braveSouls = [braveSouls1, braveSouls2, braveSouls3, braveSouls4, braveSouls5]
    // and encounter a crumbling tower
    const encounter = [encounter1, encounter2, encounter3]
    // and a passage leading down
    const passage = [passage1, passage2, passage3, passage4, passage5, passage6]
    // and an ancient door
    const ancientDoorway = [
        ancientDoorway1, 
        ancientDoorway2, 
        ancientDoorway3, 
        ancientDoorway4, 
        ancientDoorway5, 
        ancientDoorway6, 
        ancientDoorway7, 
        ancientDoorway8, 
        ancientDoorway9, 
        ancientDoorway10,
        ancientDoorway7, 
        ancientDoorway8, 
        ancientDoorway9, 
        ancientDoorway10
    ]

    const deathScene = [
        deathScene1, 
        deathScene2, 
        deathScene3, 
        deathScene4, 
        deathScene5, 
        deathScene6, 
        deathScene7, 
        deathScene8, 
        deathScene9, 
        deathScene10,
        deathScene11, 
        deathScene12, 
        deathScene13, 
        deathScene14, 
        deathScene15, 
        deathScene16, 
        deathScene17, 
        deathScene18, 
        deathScene19, 
        deathScene20,
        deathScene21, 
        deathScene22, 
        deathScene23, 
        deathScene24, 
        deathScene25, 
        deathScene26, 
        deathScene27, 
        deathScene28, 
        deathScene29, 
        deathScene30,
        deathScene31, 
        deathScene32, 
        deathScene33, 
        deathScene34, 
        deathScene35, 
        deathScene36, 
        deathScene37, 
        deathScene38, 
        deathScene39, 
        deathScene40,
        deathScene41, 
        deathScene42, 
        deathScene43, 
        deathScene44, 
        deathScene45, 
        deathScene46, 
        deathScene47, 
        deathScene48, 
        deathScene49, 
        deathScene50,
        deathScene51, 
        deathScene52, 
        deathScene53, 
        deathScene54, 
        deathScene55, 
        deathScene56, 
        deathScene57, 
        deathScene58, 
        deathScene59, 
        deathScene60,
        deathScene61, 
        deathScene63, 
        deathScene64, 
        deathScene65, 
        deathScene66, 
        deathScene67, 
        deathScene68, 
        deathScene69, 
        deathScene70,
        deathScene71,
        deathScene71, 
        deathScene72, 
        deathScene73, 
        deathScene74, 
        deathScene75, 
        deathScene76, 
        deathScene77, 
        deathScene78, 
        deathScene79, 
        deathScene80,
        deathScene81  
    ]

    const introSequence = [
        {
            image: pickRandom(darkForest),
            text: 'In the deep of night',
            id: 1
        },
        {
            image: pickRandom(oldMap),
            text: 'an old map was found.',
            id: 2
        },
        {
            image: pickRandom(braveSouls),
            text: 'Three brave souls set out ',
            id: 3
        },
        {
            image: pickRandom(encounter),
            text: 'and encounter a crumbling tower',
            id: 4
        },
        {
            image: pickRandom(passage),
            text: 'and a passage leading down...',
            id: 5
        },
        {
            image: pickRandom(ancientDoorway),
            text: 'to an ancient door.',
            id: 6
        }
    ]

    const deathSequence = [
        {
            image: pickRandom(deathScene),
            text: 'Death has come for you',
            id: 1
        }
    ]

    // Track timers so we can clear them if the component unmounts
    const timersRef = useRef([]);

    const delay = (numSeconds) => {
        return new Promise((resolve) => {
            const id = setTimeout(()=>{
                resolve(numSeconds, ' complete')
            }, numSeconds * 1000)
            try { timersRef.current.push(id); } catch(e){}
        })
    }

    const runSequence = (type) => {
        let cloneArray;
        console.log('run sequence type: ', type);

        switch(type){
            case 'intro':
                console.log('in intro');
                cloneArray =  Array.from(introSequence);
                console.log('cloneArray: ', cloneArray);
            break;
            case 'death': 
            cloneArray =  Array.from(deathSequence);
            break;
            default:
                console.log('NO TYPE'); return
        }
    
        let counter;
        const fireItOff = () => {
            console.log('fire it off, cloneArray: ', cloneArray);
            if(!cloneArray) return;
            // let sequence = counter % 2 === 1 ? introSequenceOdd.shift() : introSequenceEven.shift()
            let sequence = cloneArray.shift();
            console.log('sequence: ', sequence);
            if(sequence.id % 2 === 1){
                setCurrentOddSequence(sequence)
            } else {
                setCurrentEvenSequence(sequence)
            }
            setCurrentSequence(sequence);
            counter = sequence.id;
    
            let nextSequence = cloneArray.find(e=>e.id === counter + 1)
            console.log('next sequence: ', nextSequence);
            if(counter % 2 === 0 && nextSequence){
                delay(1.5).then(()=>{
                    setCurrentOddSequence(nextSequence)
                })
            } else if(counter > 1 && nextSequence){
                delay(1.5).then(()=>{
                    setCurrentEvenSequence(nextSequence)
                })
            }
    
            delay(4).then(()=>{
                console.log('inside delay');
                if(cloneArray.length){
                    fireItOff();
                } else {
                    switch(type){
                        case 'intro':
                            props.endIntroSequence();
                        break;
                        case 'death': 
                            props.endDeathSequence();
                        break;
                        default:
                            console.log('NO TYPE'); return
                    }
                    endSequenceAndNav();
                }
            })
        }
        const endSequenceAndNav = () => {
            console.log('end Sequence and Navb');
            switch(type){
                case 'intro':
                    props.endIntroSequence();
                    setNavToDungeon(true)
                    break;
                    case 'death': 
                    setWreckImage(true)
                    delay(0.85).then(()=>{
                        setMoreWrecked(true)
                        delay(1).then(()=>{
                            
                            setFadeOutLastFrame(true);
                            const __id = setTimeout(()=>{
                                props.endDeathSequence();
                                setNavToLanding(true)
                            }, 700)
                            try { timersRef.current.push(__id); } catch(e){}
                        })
                    })
                    break;
                    default:
                        console.log('NO TYPE'); return
                    }
                }
                // props.endIntroSequence();
                // endSequenceAndNav();
                // return
        fireItOff();
    }
  useEffect(()=> {
    console.log('in use effect, props', props);
    switch(props.sequenceType){
        case 'intro':
            setCurrentOddSequence(introSequence[0])
            setCurrentEvenSequence(introSequence[1])

            delay(1).then(()=>{
                setFadeInFirstFrame(true);
                runSequence('intro');
            })
            props.beginIntroSequence();
        break;
        case 'death':
            setCurrentOddSequence(deathSequence[0])
            delay(1).then(()=>{
                setFadeInFirstFrame(true);
                runSequence('death');
            })
            props.beginDeathSequence();
        break;
        default:
        break;
    }
    // [deathSequence, introSequence, props]
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // cleanup timers on unmount
    useEffect(() => {
        return () => {
            try { timersRef.current.forEach(id => clearTimeout(id)); } catch(e){}
            timersRef.current = [];
        }
    }, [])

  return (
    <div className="intro-pane pane">
        {currentOddSequence && <img 
         alt=""
         className={`intro-image ${wreckImage ? 'wrecked' : ''} ${moreWrecked ? 'more-wrecked' : ''}`}
         src={currentOddSequence.image}
         style={{opacity: moreWrecked ? 0 : 
            (currentSequence && currentSequence.id%2===1 ? 1 : (fadeOutLastFrame ? 0 : 0))}}  
         />}

         {currentEvenSequence && <img 
         alt=""
         className={`intro-image ${wreckImage ? 'wrecked' : ''} ${moreWrecked ? 'more-wrecked' : ''}`}
         src={currentEvenSequence.image}
         style={{opacity: 
            moreWrecked ? 0 :
            (currentSequence && currentSequence.id%2===0 && fadeInFirstFrame ? 1 : 0)
        }}  
         />}

         {currentSequence && currentSequence.id%2===0 && <div 
         className="text-container">
            <Typewriter text={currentSequence.text} delay={40}></Typewriter>
         </div>}

         {currentSequence && currentSequence.id%2===1 && <div 
         className="text-container">
            <Typewriter text={currentSequence.text} delay={40}></Typewriter>
         </div>}
         { navToDungeon && <Redirect to='/dungeon'/> }
         { navToLanding && <Redirect to='/landing'/> }
    </div>
  )
}