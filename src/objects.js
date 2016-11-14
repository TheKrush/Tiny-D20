function RollConfig(numberOfRolls, dieType, modifier) {
    this.numberOfRolls = parseInt(numberOfRolls);
    this.dieType = parseInt(dieType);
    if (modifier) {
        this.modifier = parseInt(modifier);
    } else {
        this.modifier = 0;
    }
}

RollConfig.prototype.toString = function() {
    var string = this.numberOfRolls + "d" + this.dieType;
    if (this.modifier) {
        string += "+" + this.modifier;
    }
    return string;
}

RollConfig.cast = function(rollConfig) {
    return new RollConfig(rollConfig.numberOfRolls, rollConfig.dieType, rollConfig.modifier);
}

/**
 * iconColor: String
 * alwaysShowAdvanced: Boolean
 * showRollAnimation: Boolean
 * macros: Macro[]
 * onlyShowMacroName: Boolean
 **/
function Configuration(iconColor, alwaysShowAdvanced, showRollAnimation, macros, onlyShowMacroName) {
    this.iconColor = iconColor;
    this.alwaysShowAdvanced = alwaysShowAdvanced;
    this.showRollAnimation = showRollAnimation;
    this.macros = macros;
    this.onlyShowMacroName = onlyShowMacroName;
}

/**
 * name: String
 * rollConfig: RollConfig
 **/
function Macro(name, rollConfig) {
    this.name = name;
    this.rollConfig = rollConfig;
}
