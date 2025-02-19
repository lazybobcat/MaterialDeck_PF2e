const data = {
    moduleId: 'materialdeck-pf2e',
    systemId: 'pf2e',
    systemName: 'Pathfinder 2e'
}

const limitedSheets = ['loot', 'vehicle'];

const proficiencyColors = {
    untrained: "#424242",
    trained: "#171F69",
    expert: "#3C005E",
    master: "#664400",
    legendary: "#5E0000"
};

class system {
    conf;

    constructor(){
        console.log(`Material Deck: Using system '${data.systemName}'`);
        this.conf = CONFIG.PF2E;
    }

    tokenSpellData = new Map();

    getActorData(token) {
        return token.actor.system;
    }

    getItemData(item) {
        return item.system;
    }

    getStatsList() {
        return [
            {value:'HP', name:'HP'},
            {value:'HPbox', name:'HP (box)'},
            {value:'HPbar', name:'HP (bar)'},
            {value:'TempHP', name:'Temp HP'},
            {value:'AC', name:'AC'},
            {value:'ShieldHP', name:'Shield HP'},
            {value:'Speed', name:'Speed'},
            {value:'Init', name:'Initiative'},
            {value:'Ability', name:'Ability Score'},
            {value:'AbilityMod', name:'Ability Score Modifier'},
            {value:'Save', name:'Saving Throw Modifier'},
            {value:'Skill', name:'Skill Modifier'},
            {value:'Condition', name: 'Condition'},
            {value:'Perception', name: 'Perception'}
        ]
    }

    getAttackModes() {
        return [
        ]
    }

    getOnClickList() {
        return []
    }

    getHP(token) {
        const hp = token.actor.attributes?.hp;
        return {
            value: (hp?.value == null) ? 0 : hp.value,
            max: (hp?.max == null) ? 0 : hp.max
        }
    }

    getTempHP(token) {
        const hp = token.actor.attributes?.hp;
        return {
            value: (hp?.temp == null) ? 0 : hp.temp,
            max: (hp?.tempmax == null) ? 0 : hp.tempmax
        }
    }

    getAC(token) {
        const ac = token.actor.attributes?.ac;
        return (ac?.value == null) ? 10 : ac?.value;
    }

    getShieldHP(token) {
        const shieldhp = token.actor.attributes.shield
        return (shieldhp?.value == null) ? 0 : shieldhp?.value;
    }

    getSpeed(token) {
        if (this.isLimitedSheet(token.actor) || token.actor.type == 'hazard') {
            if (token.actor.type == 'vehicle') {
                return this.getActorData(token).details.speed;
            } else return '';
        }
        let speed = `${token.actor.attributes.speed?.total}'`;
        const otherSpeeds = token.actor.attributes.speed?.otherSpeeds;
        if (otherSpeeds.length > 0)
            for (let os of otherSpeeds) 
                 speed += `\n${os.type} ${os.total}'`;    
        return speed;
    }

    getInitiative(token) {
        if (this.isLimitedSheet(token.actor) || token.actor.type == 'familiar') return '';
        if (token.actor.type == 'hazard') {
            let initiative = token.actor.attributes?.stealth?.value;
            return `Init: Stealth (${initiative})`; 
        }
        let initiative = token.actor.initiative;
        let initiativeModifier = initiative?.mod;
        let initiativeLabel = initiative?.statistic.label; //Initiative is too long for the button
        if (initiativeModifier > 0) {
            initiativeModifier = `+${initiativeModifier}`;
        } else {
            initiativeModifier = this.getPerception(token); //NPCs won't have a valid Initiative value, so default to use Perception
        } 
        return `${initiativeLabel} (${initiativeModifier})`;
    }

    toggleInitiative(token) {
        return;
    }

    getPassivePerception(token) {
        return;
    }

    getPassiveInvestigation(token) {
        return;
    }

    getPerception(token) {
        if (this.isLimitedSheet(token.actor) || token.actor.type == 'hazard') return '';
        let perception = token.actor.perception.mod;
        return (perception >= 0) ? `+${perception}` : perception;
    }

    getAbility(token, ability) {
        if (this.isLimitedSheet(token.actor) || token.actor.type == 'familiar') return '';
        if (ability == undefined) ability = 'str';
        return token.actor.abilities?.[ability]?.mod*2 + 10;
    } 

    getAbilityModifier(token, ability) {
        if (this.isLimitedSheet(token.actor) || token.actor.type == 'hazard' || token.actor.type == 'familiar') return '';
        if (ability == undefined) ability = 'str';
        let val = token.actor.abilities?.[ability]?.mod;
        return (val >= 0) ? `+${val}` : val;
    }

    getAbilitySave(token, ability) {
        if (ability == undefined) return 'fortitude';
        //ability = this.fixSave(ability);
        const save = this.findSave(token, ability);
        if (save == undefined) return '';
        let val = save?.value;
        return (val >= 0) ? `+${val}` : val;
    }

    getAbilityList() {
        const keys = Object.keys(this.conf.abilities);
        let abilities = [];
        for (let k of keys) abilities.push({value:k, name:game.i18n.localize(this.conf.abilities?.[k])})
        return abilities;
    }

    findSave(token, ability) {
        if (this.isLimitedSheet(token.actor)) return;
        return this.getActorData(token).saves?.[ability];
    }

    /*
    fixSave(ability) {
        if (ability == undefined) return 'fortitude';
        else if (ability == 'fort') return 'fortitude';
        else if (ability == 'ref') return 'reflex';
        else if (ability == 'will') return 'will';
    }
    */

    getSavesList() {
        const keys = Object.keys(this.conf.saves);
        let saves = [];
        for (let k of keys) saves.push({value:k, name:game.i18n.localize(this.conf.saves?.[k])})
        return saves;
    }

    getSkill(token, skill) {
        if (skill == undefined) skill = 'acr';
        const tokenSkill = this.findSkill(token, skill);
        if (tokenSkill == undefined) return '';
        if (skill.startsWith('lor')) {
            return `${tokenSkill.name}: +${tokenSkill.totalModifier}`;
        }

        const val = tokenSkill.totalModifier;
        return (val >= 0) ? `+${val}` : val;
    }

    findSkill(token, skill) {
        if (this.isLimitedSheet(token.actor)) return;
        if (skill == undefined) skill = 'acr';
        if (skill.startsWith('lor')) {
            const index = parseInt(skill.split('_')[1])-1;
            const loreSkills = this.getLoreSkills(token);
            if (loreSkills.length > index) {
                return loreSkills[index];
            } else {
                return;
            }
        }
        return this.getActorData(token).skills?.[skill];
    }

    getSkillList() {
        const keys = Object.keys(this.conf.skills);
        let skills = [];
        for (let s of keys) {
            skills.push({value:s, name:game.i18n.localize(this.conf.skills?.[s])})
        }
        for (let i=1; i<4; i++) skills.push({value:`lor_${i}`, name: `${game.i18n.localize(this.conf.skillList.lore)} #${i}`})
        return skills;
    }

    getLoreSkills(token) {
        if (this.isLimitedSheet(token.actor)) return [];
        const skills = this.getActorData(token).skills;
        return Object.keys(skills).map(key => skills[key]).filter(s => s.lore == true);
    }

    getProficiency(token) {
        return;
    }

    getCondition(token,condition) {
        if (condition == undefined || condition == 'removeAll') return undefined;
        const Condition = this.getConditionName(condition);
        const effects = token.actor.items.filter(i => i.type == 'condition');
        return effects.find(e => e.name.split(' ')[0] === Condition);
    }

    getConditionIcon(condition) {
        if (condition == undefined) condition = 'removeAll';
        if (condition == 'removeAll') return window.CONFIG.controlIcons.effects;
        //else return `${CONFIG.PF2E.statusEffects.iconDir}${condition}.webp`;
        else return CONFIG.statusEffects.find(e => e.id === condition).icon;
    }

    getConditionActive(token,condition) {
        if (condition == 'dead') return token.actor.isDead;
        return this.getCondition(token,condition) != undefined;
    }

    getConditionValue(token,condition) {
        const effect = this.getCondition(token, condition);
        if (effect != undefined && effect?.value != null) return effect;
    }

    async modifyConditionValue(token,condition,delta) {
        if (condition == undefined) condition = 'removeAll';
        if (condition == 'removeAll'){
            for( let effect of token.actor.items.filter(i => i.type == 'condition'))
                await effect.delete();
        } else {
            const effect = this.getConditionValue(token,condition);
            if (effect == undefined) {
                if (delta > 0) {
                    const newEffect = game.pf2e.ConditionManager.conditions.get(condition).toObject();
                    await token.actor?.createEmbeddedDocuments("Item", [newEffect]);
                }
            } else {
                try {
                    await game.pf2e.ConditionManager.updateConditionValue(effect.id, token, effect.value+delta);                                
                } catch (error) {
                    //Do nothing. updateConditionValue will have an error about 'documentData is not iterable' when called from an NPC token. 
                }
            }
        }
        return true;
    }

    getConditionName(condition) {
        if ("flatFooted" == condition) {
            return 'Flat-Footed'; //An inconsistency has been introduced on the PF2E system. The icon is still using 'flatFooted' as the name, but the condition in the manager has been renamed to 'Flat-Footed'
        } else return condition.charAt(0).toUpperCase() + condition.slice(1);
    }

    async toggleCondition(token,condition) {
        if (condition == undefined) condition = 'removeAll';
        if (condition == 'removeAll'){
            for( let effect of token.actor.items.filter(i => i.type == 'condition'))
                await effect.delete();
        }
        else if (condition == 'dead') {
            const icon = CONFIG.statusEffects.find(e => e.id === CONFIG.specialStatusEffects.DEFEATED).icon;
            await token.toggleEffect(icon, {overlay:true})
        }
        else {
            const effect = this.getCondition(token,condition);
            if (effect == undefined) {
                const newEffect = game.pf2e.ConditionManager.conditions.get(condition).toObject();
                await token.actor?.createEmbeddedDocuments("Item", [newEffect]);
            }
            else {
                effect.delete();
            }
        }
        return true;
    }

    getConditionList() {
        let conditions = [];
        for (let c of CONFIG.statusEffects) conditions.push({value:c.id, name:game.i18n.localize(c.label)});
        return conditions;
    }

    /**
     * Roll
     */
     roll(token,roll,options,ability,skill,save) {
        if (this.isLimitedSheet(token.actor)) return;
        options.skipDialog = true;
        if (roll == undefined) roll = 'skill';
        if (ability == undefined) ability = 'str';
        if (skill == undefined) skill = 'acr';
        if (save == undefined) save = 'fort';
        if (roll == 'perception') {
            this.checkRoll(`Perception Check`, token.actor.perception, 'perception-check', token.actor);
        }
        if (roll == 'initiative') {
            token.actor.rollInitiative({createCombatants:true, initiativeOptions: {skipDialog: true}});
        }
            
        if (roll == 'ability') return; //Ability Checks are not supported in pf2e
        else if (roll == 'save') {
            let ability = save;
            if (ability == 'fort') ability = 'fortitude';
            else if (ability == 'ref') ability = 'reflex';
            else if (ability == 'will') ability = 'will';
            if (token.actor.type == 'hazard' && ability == 'will') return; //Hazards don't have Will saves
            let abilityName = ability.charAt(0).toUpperCase() + ability.slice(1);
            this.checkRoll(`${abilityName} Saving Throw`, token.actor.saves?.[ability], 'saving-throw', token.actor);
        }
        else if (roll == 'skill') {
            if (skill.startsWith('lor')) {
                const index = parseInt(skill.split('_')[1])-1;
                const loreSkills = this.getLoreSkills(token);
                if (loreSkills.length > index) {
                    let loreSkill = loreSkills[index];
                    skill = loreSkill.shortform == undefined? loreSkills[index].expanded : loreSkills[index].shortform;
                } else {
                    return;
                }
            }
            let skillName = this.getActorData(token).skills?.[skill].name;
            console.log('skillName',skillName)
            skillName = skillName.charAt(0).toUpperCase() + skillName.slice(1);
            this.checkRoll(`Skill Check: ${skillName}`, token.actor.skills?.[skill], 'skill-check', token.actor);
        }
    }

    checkRoll(checkLabel,stat,type,actor) {
        let checkModifier = new game.pf2e.CheckModifier(checkLabel, stat);
        game.pf2e.Check.roll(checkModifier, {type:type, actor: actor, skipDialog: true}, null);
    }

    getRollTypes() {
        return [
            {value:'initiative', name:'Initiative'},
            {value:'perception', name:'Perception'}
        ]
    }

    /**
     * Items
     */
    getItems(token,itemType) {
        if (this.isLimitedSheet(token.actor)) return [];
        if (itemType == undefined) itemType = 'any';
        const allItems = token.actor.items;
        if (itemType == 'any') return allItems.filter(i => i.type == 'weapon' || i.type == 'equipment' || i.type == 'consumable' || i.type == 'loot' || i.type == 'container');
        if (itemType == 'weapon') return allItems.filter(i => i.type == 'weapon' || i.type == 'melee')  //Include melee actions for NPCs without equipment
        else return allItems.filter(i => i.type == itemType);
    }

    getItemUses(item) {
        return {available: item.quantity};
    }

    getItemTypes() {
        return [
            {value:'weapon', name:'Weapons'},
            {value:'armor', name:'Armor'},
            {value:'equipment', name:'Equipment'},
            {value:'consumable', name:'Consumables'},
            {value:'treasure', name:'Treasure'}
        ]
    }

    getWeaponRollModes() {
        return []
    }
    
    /**
     * Features
     */
     getFeatures(token,featureType) {
        if (this.isLimitedSheet(token.actor)) return [];
        if (featureType == undefined) featureType = 'any';
        const allItems = token.actor.items;
        if (featureType == 'any') return allItems.filter(i => i.type == 'ancestry' || i.type == 'background' || i.type == 'class' || i.type == 'feat' || i.type == 'action' || i.type == 'heritage' || i.type == 'deity' || i.type == '');
        if (featureType == 'feat-any') return allItems.filter(i => i.type == 'feat');
        if (featureType == 'ancestryfeature') return allItems.filter(i => i.type == 'feat' && i.featType == 'ancestryfeature');
        if (featureType == 'classfeature') return allItems.filter(i => i.type == 'feat' && i.featType == 'classfeature');
        if (featureType == 'feat-anc') return allItems.filter(i => i.type == 'feat' && i.featType == 'ancestry');
        if (featureType == 'feat-arc') return allItems.filter(i => i.type == 'feat' && i.featType == 'archetype' && i.name.indexOf('Dedication') < 0);
        if (featureType == 'feat-ded') return allItems.filter(i => i.type == 'feat' && i.featType == 'archetype' && i.name.indexOf('Dedication') > 0);
        if (featureType == 'feat-cla') return allItems.filter(i => i.type == 'feat' && i.featType == 'class');
        if (featureType == 'feat-gen') return allItems.filter(i => i.type == 'feat' && i.featType == 'general');
        if (featureType == 'feat-ski') return allItems.filter(i => i.type == 'feat' && i.featType == 'skill');
        if (featureType == 'action-any') return allItems.filter(i => i.type == 'action');
        if (featureType == 'action-def') return allItems.filter(i => i.type == 'action' && this.getItemData(i).actionCategory?.value == 'defensive');
        if (featureType == 'action-int') return allItems.filter(i => i.type == 'action' && this.getItemData(i).actionCategory?.value == 'interaction');
        if (featureType == 'action-off') return allItems.filter(i => i.type == 'action' && this.getItemData(i).actionCategory?.value == 'offensive');
        if (featureType == 'strike') { //Strikes are not in the actor.items collection
            if (token.actor.type == 'hazard' || token.actor.type == 'familiar') {
                return allItems.filter(i => i.type == 'melee' || i.type == 'ranged');
            }
            let actions = this.getActorData(token).actions?.filter(a=>a.type == 'strike');
            for (let a of actions) {
                a.img = a.imageUrl;
                a.data = {
                    sort: 1
                };
            }
            return actions;
        }
        else return allItems.filter(i => i.type == featureType)
    }

    getFeatureUses(item) {
        if (item.data.type == 'class') return {available: item.parent.data.data.details.level.value};
        else return;
    }

    getFeatureTypes() {
        return [
            {value:'ancestry', name:'Ancestry'},
            {value:'ancestryfeature', name:'Ancestry Feature'},
            {value:'heritage', name: 'Heritage'},
            {value:'background', name: 'Background'},
            {value:'class', name:'Class'},
            {value:'classfeature', name:'Class Feature'},
            {value:'deity', name: 'Deity'},
            {value:'feat-any', name:'Feats - Any'},
            {value:'feat-anc', name:'Feats - Ancestry'},
            {value:'feat-arc', name: 'Feats - Archetype'},
            {value:'feat-ded', name: 'Feats - Dedication'},
            {value:'feat-cla', name: 'Feats - Class'},
            {value:'feat-gen', name: 'Feats - General'},
            {value:'feat-ski', name: 'Feats - Skill'},
            {value:'action-any', name:'Actions - Any'},
            {value:'action-def', name:'Actions - Defensive'},
            {value:'action-int', name:'Actions - Interaction'},
            {value:'action-off', name:'Actions - Offensive'},
            {value:'strike', name:'Strikes'}
        ]
    }

    /**
     * Spells
     */
    buildSpellData(token) {
        let spellData = [[],[],[],[],[],[],[],[],[],[],[],[]];
        let spellcastingEntries = token.actor.spellcasting.contents; /////
        console.log('spEntries',spellcastingEntries)
        const actorLevel = this.getActorData(token).details.level.value;
        spellcastingEntries.forEach(spellCastingEntry => {
            if (spellCastingEntry.category != 'ritual') {
                console.log('entry',spellCastingEntry)
                let highestSpellSlot = Math.ceil(actorLevel/2);
                while (spellCastingEntry.system.slots?.[`slot${highestSpellSlot}`]?.max <= 0) highestSpellSlot--;
                //Prepared (not flexible)
                
                if (spellCastingEntry.system.prepared?.value == 'prepared' && !spellCastingEntry?.system?.prepared?.flexible == true) {
                    for (let slotLevel = 0; slotLevel < 11; slotLevel++) {
                        for (let slot = 0; slot < spellCastingEntry.system.slots?.[`slot${slotLevel}`].max; slot++) {
                            let spellId = spellCastingEntry.system.slots?.[`slot${slotLevel}`].prepared?.[slot].id;
                            let spell = spellCastingEntry.spells.get(spellId);
                            if (spellId != null) {
                                spellData[slotLevel].push(spell);
                            }
                        }
                    }
                } else {
                    spellCastingEntry.spells.forEach( ses => {
                        if ((spellCastingEntry.system.prepared.value == 'spontaneous' || spellCastingEntry.system.prepared?.flexible == true) && ses.data.data.location.signature == true) {
                            let baseLevel = this.getSpellLevel(ses);
                            for (let level = baseLevel; level <= highestSpellSlot; level++) {
                                spellData[level].push(ses);
                            }
                        } else {
                            spellData[this.getSpellLevel(ses)].push(ses);
                        }
                    });
                }
            }
            
            
        });
        this.tokenSpellData.set(token.id,  {spellData: spellData, timeStamp: Date.now()});
        console.log('spellData',spellData)
        return spellData;
    }

    getSpellData(token) {
        let existingSpellData = this.tokenSpellData.get(token.id);
        if (existingSpellData == undefined) return this.buildSpellData(token);
        let milisSinceCreation = Date.now() - existingSpellData.timeStamp;
        if (milisSinceCreation > 10000) {
            this.tokenSpellData.delete(token.id);
            return this.buildSpellData(token);
        }
        return existingSpellData.spellData;
    }

    getSpellLevel(spell) {
        if (spell.isFocusSpell == true) return 11;
        if (spell.isCantrip == true) return 0;
        return spell.level;
    }

    getSpells(token,level,type) {
        if (this.isLimitedSheet(token.actor)) return '';
        if (level == undefined) level = 'any';
        let spellData = this.getSpellData(token);

        if (level == 'f') return this.getUniqueSpells(spellData[11]);
        if (level == 'any') return this.getUniqueSpells(spellData.flat());
        return this.getUniqueSpells(spellData[level]);
    }

    getUniqueSpells(spells) {
        return Array.from(new Set(spells));
    }

    getSpellUses(token,level,item) {
        if (this.isLimitedSheet(token.actor)) return '';
        if (level == undefined || level == 'any') level = item.level;
        if (item.isCantrip == true) return;
        if (item.isFocusSpell == true) return {
            available: this.getActorData(token).resources.focus.value,
            maximum: this.getActorData(token).resources.focus.max
        }
        const spellbook = this.findSpellcastingEntry(token.actor, item);
        if (spellbook == undefined) return;
        if (spellbook.data.data.prepared.value == 'innate') {
            return {
                available: this.getItemData(item).location.uses.value,
                maximum: this.getItemData(item).location.uses.max
            }
        }
        if (spellbook.data.data.prepared.value == 'prepared') {
            if (!spellbook.data.data.prepared?.flexible == true) {
                let slotsExpended = 0;
                let slotsPrepared = 0;
                for (let slot = 0; slot < spellbook.data.data.slots?.[`slot${level}`].max; slot++) {
                    let slotEntry = spellbook.data.data.slots?.[`slot${level}`].prepared?.[slot];
                    if (slotEntry.id == item.id) {
                        slotsPrepared++;
                        if (slotEntry?.expended == true) {
                            slotsExpended++;
                        }
                    }
                }
                return {
                    available: slotsPrepared - slotsExpended,
                    maximum: slotsPrepared
                }
            }
        }
        return {
            available: spellbook.data.data.slots?.[`slot${level}`].value,
            maximum: spellbook.data.data.slots?.[`slot${level}`].max
        }
    }

    findSpellcastingEntry(actor, spell) {
        let spellcastingEntries = actor.spellcasting;
        let result;
        spellcastingEntries.forEach(spellCastingEntry => {
            if (spellCastingEntry.spells.get(spell.id) != undefined) {
                result = spellCastingEntry;
            }
        });
        return result;
    }

    getSpellLevels() {
        //const keys = Object.keys(this.conf.spellLevels);
        let levels = [
            {value:'f', name: game.i18n.localize("PF2E.TraitFocus")},
            {value:'0', name: game.i18n.localize("PF2E.TraitCantrip")},
            {value:'1', name: '1'},
            {value:'2', name: '2'},
            {value:'3', name: '3'},
            {value:'4', name: '4'},
            {value:'5', name: '5'},
            {value:'6', name: '6'},
            {value:'7', name: '7'},
            {value:'8', name: '8'},
            {value:'9', name: '9'},
            {value:'10', name: '10'}
        ];
        //for (let l of keys) levels.push({value:l, name:game.i18n.localize(this.conf.spellLevels?.[l])});
        return levels;
    }

    getSpellTypes() {
        return [
        ]
    }

    rollItem(item, settings) {
        let variant = 0;
        if (game.materialDeck.otherControls.rollOption == 'map1') variant = 1;
        if (game.materialDeck.otherControls.rollOption == 'map2') variant = 2;
        if (item?.parent?.type == 'hazard' && item.type==='melee') return item.rollNPCAttack({}, variant+1);
        if (item.type==='strike') return item.variants[variant].roll({event});
        if (item?.parent?.type !== 'hazard' && (item.type==='weapon' || item.type==='melee')) return item.parent.data.data.actions.find(a=>a.name===item.name).variants[variant].roll({event});
        if (item.type === 'spell') {
            const spellbook = this.findSpellcastingEntry(item.parent, item);
            if (spellbook != undefined) {
                let spellLvl = item.level;
                if (settings.spellType == 'f' || settings.spellType == '0') {
                    const actorLevel = item.parent.data.data.details.level.value;
                    spellLvl =  Math.ceil(actorLevel/2);
                } else if (settings.spellType != 'any') {
                    spellLvl = settings.spellType;
                }
                if (spellbook.data.data.prepared.value == 'prepared' && !spellbook.data.data.prepared?.flexible == true) {
                    for (let slotId = 0; slotId < spellbook.data.data.slots?.[`slot${spellLvl}`].max; slotId++) {
                        let slotEntry = spellbook.data.data.slots?.[`slot${spellLvl}`].prepared?.[slotId];
                        if (slotEntry.id == item.id) {
                            if (!slotEntry?.expended == true) {
                                return spellbook.cast(item, {slot: slotId, level: spellLvl});
                            }
                        }
                    }
                } else {
                    return spellbook.cast(item, { level: spellLvl});
                }
            }
        }
        return game.pf2e.rollItemMacro(item.id);
    }

    isLimitedSheet(actor) {
        return limitedSheets.includes(actor.type);
    }

    /**
    * Ring Colors
    */
    getSkillRingColor(token, skill) {
        return this.getRingColor(this.findSkill(token, skill));
    }

    getSaveRingColor(token, save) {
        //save = this.fixSave(save);
        return this.getRingColor(this.findSave(token, save));
    }

    getRingColor(stat) {
        if (stat == undefined) return;
        let statModifiers = stat?.modifiers || stat?._modifiers;
        const profLevel = statModifiers?.find(m => m.type == 'proficiency')?.slug;
        if (profLevel != undefined) {
            return proficiencyColors?.[profLevel];
        }
        return;
    }
}

Hooks.once('MaterialDeck_Ready', () => {
    const moduleData = game.modules.get(data.moduleId);

    game.materialDeck.registerSystem({
        systemId: data.systemId,
        moduleId: data.moduleId,
        systemName: data.systemName,
        version: moduleData.version,
        manifest: moduleData.manifest,
        system
    });
});