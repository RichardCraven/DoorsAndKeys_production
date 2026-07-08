

const clone = (val) => {
    return JSON.parse(JSON.stringify(val))
}

export function OverlayManager(){
    const animationTypes = { // eslint-disable-line no-unused-vars
        targetted: {
            duration: 2
        },
        blinded: {
            duration: 5
        },
        'glowing-eyes': {
            duration: 2
        }
    }
    this.overlays = {};

    this.reset = () => {
        this.overlays = {};
    }

    this.addCombatant = (combatant) => {
        if(this.overlays[combatant.id]){
            console.log('how are you adding an existing combatant???', combatant);
            // I THINK THIS IS MULTIPLE RETICLES BEING ADDED FOR IT
            // debugger
        }
        this.overlays[combatant.id] = {
            id: combatant.id,
            animations: {},
            data: combatant
        }
    }
    this.addAnimation = (animation) => {
        // const duration = animationTypes[animation.type]?.duration * 1000;
        // const modifiedDuration = duration + 500;
        animation.locked = true;
        animation.subjectType = this.overlays[animation.id].data.type
        
        
        
        // FIRST PUSH NEW ANIMATION
        const animationMatrix = this.overlays[animation.id].animations;
        const animationBucket = animationMatrix[animation.type];
        
        
        const animationLifespanSequence = ()=>{
            let animations = clone(this.overlays)
            this.broadcastAnimationEvent(animations);

            setTimeout(()=>{
                const animationRef =  this.overlays[animation.id].animations[animation.type].find(a=>a===animation);
                animationRef.locked = false;
            }, 500)

            // setTimeout(()=>{
            //     const animationRef =  this.overlays[animation.id].animations[animation.type].find(a=>a===animation);
            //     animationRef.data.fadeOut = true;
            //     animations = clone(this.overlays)
            //     this.broadcastAnimationEvent(animations)
            // }, duration)

            // setTimeout(()=>{
            //     if(!this.overlays[animation.id]) return
            //     let individualsAnimations =  this.overlays[animation.id].animations[animation.type];
            //     individualsAnimations = individualsAnimations.filter(a=>a!==animation)
            //     this.overlays[animation.id].animations[animation.type] = individualsAnimations;
            //     animations = clone(this.overlays)
            //     this.broadcastAnimationEvent(animations)
            // }, modifiedDuration)
        }

        if(animationBucket){
            if(animationBucket.length > 0){
                // there's still an animation in this queueu
                const mostRecentItem = animationBucket[animationBucket.length-1];
                if(mostRecentItem.locked){
                    setTimeout(()=>{
                        animationMatrix[animation.type].push(animation)
                        animationLifespanSequence();
                    },500)
                } else {
                    animationMatrix[animation.type].push(animation)
                    animationLifespanSequence();
                }
            } else {
                //bucket is empty, proceed without delay
                animationMatrix[animation.type].push(animation)
                animationLifespanSequence();
            }
        } else {
            animationMatrix[animation.type] = [];
            animationMatrix[animation.type].push(animation)
            animationLifespanSequence();
        }
    }

    this.establishBroadcastAnimationEventCallback = (cb) => {
        this.broadcastAnimationEvent = cb;
    }
}