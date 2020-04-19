window.onload = init;

var advancedIsShown = false;
var config = null;
var rollsLeft = ROLLS_PER_ANIMATION;
var rollTimer = null;

function init() {
    loadConfig(function() {
        addEventHandlers();
        hideAdvancedInit();
        loadMacrosList();
        updateRollButton();
    });
}

function loadConfig(callback) {
    chrome.storage.sync.get(PRIMARY_CONFIG_KEY, function(items) {
        config = items[PRIMARY_CONFIG_KEY] || DEFAULT_CONFIGURATION;
        callback();
    });
}

function addEventHandlers() {
    $("#roll-button").click(rollClickHandler)
    $("#toggle-advanced").click(toggleAdvanced);
    $("#options").click(openOptions);

    $("#die-type-container").on("change", updateRollButton);
    $("#num-rolls").on("input", updateRollButton);
    $("#modifier").on("input", updateRollButton);
    $("#modifierPerRoll").on("change", updateRollButton);
}

function updateRollButton() {
    var rollButton = $("#roll-button");
    var currentRollConfig = captureCurrentRollConfig();
    var disabled = !DICE_NOTATION_REGEX.test(currentRollConfig.toString());
    if (currentRollConfig.numberOfRolls <= 0) {
        disabled = true;
    }
    rollButton.prop("disabled", disabled);

    var buttonLabel = "Roll " + currentRollConfig.toString() + "!";
    if (disabled) {
        buttonLabel = "Enter a valid roll";
    }
    rollButton.prop("value", buttonLabel);
}

function rollClickHandler(event) {
    var rollConfig = captureCurrentRollConfig();
    rollsLeft = ROLLS_PER_ANIMATION;
    roll(rollConfig);
}

function loadMacrosList() {
    var macrosList = config.macros;
    if (macrosList.length > 0) {
        var newHTML = ""
        for(var i = 0; i < macrosList.length; i++) {
            var name = macrosList[i].name;
            var rollConfig = RollConfig.cast(macrosList[i].rollConfig).toString();
            var rollConfigHTML = " (" + rollConfig + ")";
            var htmlStart = "<input type=button class='macroButton' value='" + name;
            newHTML += htmlStart;
            if (!config.onlyShowMacroName) {
                newHTML += rollConfigHTML;
            }
            var htmlEnd = "' id='macro" + i + "'>";
            newHTML += htmlEnd;
        }
        $("#macros_list").html(newHTML);
        initMacroBindings();
    }
}


function initMacroBindings() {
    var macrosList = config.macros;
    for(var i = 0; i < macrosList.length; i++) {
        var macroButton = document.getElementById('macro' + i);
        macroButton.onclick = (function(i) {
            return function() {
                var rollConfig = config.macros[i].rollConfig;
                roll(rollConfig);
            };
        })(i);
    }
}

/**
 * Takes a RollConfig and simulates a dice roll.
 **/
function roll(rollConfig) {
    var total = 0;
    var rollsArray = [];
    for (var rollNumber = 0; rollNumber < parseInt(rollConfig.numberOfRolls); rollNumber++) {
        var currentRoll = randInt(1, rollConfig.dieType);
        if (rollConfig.modifierPerRoll) {
            currentRoll += parseInt(rollConfig.modifier);
        }
        total += currentRoll;
        rollsArray[rollNumber] = currentRoll;
    }
    if (!rollConfig.modifierPerRoll) {
        total += parseInt(rollConfig.modifier);
    }

    if (config.showRollAnimation) {
        if (rollsLeft > 0) {
            if (!$("#result").hasClass("temp_roll")) {
                $("#result").addClass("temp_roll");
            }
            var time = ROLL_DELAY + (ROLLS_PER_ANIMATION - rollsLeft) * ROLL_INCREMENT;
            time += randInt(-1, 1) * randInt(0, ROLL_DELAY / 2);
            rollTimer = setTimeout(function() {
                roll(rollConfig);
                rollsLeft--;
            }, time);
        } else {
            $("#result").removeClass("temp_roll");
            rollsLeft = ROLLS_PER_ANIMATION;
            clearTimeout(rollTimer);
        }
    }

    var minPossibleResult = 0
    var maxPossibleResult = 0

    if (rollConfig.modifierPerRoll) {
        minPossibleResult = parseInt(1) + parseInt(rollConfig.modifier);
        maxPossibleResult = parseInt(rollConfig.dieType) + parseInt(rollConfig.modifier)
    } else {
        minPossibleResult = parseInt(rollConfig.numberOfRolls) + parseInt(rollConfig.modifier);
        maxPossibleResult = parseInt(rollConfig.numberOfRolls) * parseInt(rollConfig.dieType) + parseInt(rollConfig.modifier);
    }
    setResult(total, minPossibleResult, maxPossibleResult);
    $("#toggle-advanced").show();
    if (config.alwaysShowAdvanced) {
        showAdvanced();
    }
    var includedModifier = 0;
    if (rollConfig.modifierPerRoll) {
        includedModifier = parseInt(rollConfig.modifier);
    }
    setAdvancedResultsFromArray(rollsArray, 1, rollConfig.dieType, includedModifier);
}

/**
 * Returns a random integer between lowerBounds and upperBounds (inclusive)
 **/
function randInt(lowerBounds, upperBounds) {
    if (lowerBounds > upperBounds) {
        throw new Error("Lower bound cannot be greater than upper bound.");
    }
    return (Math.floor(Math.random() * upperBounds) + lowerBounds);
}

function openOptions() {
    if (chrome.runtime.openOptionsPage) {
        // New way to open options pages, if supported (Chrome 42+).
        chrome.runtime.openOptionsPage();
    } else {
        // Reasonable fallback.
        window.open(chrome.runtime.getURL('options.html'));
    }
}

/**
 * Takes a number and sets it to be the current roll result
 **/
function setResult(number, minPossibleResult, maxPossibleResult) {
    var result = $("#result");
    result.html(number);

    result.removeClass("nat-max-text nat-min-text");
    if (number == maxPossibleResult) {
        result.addClass("nat-max-text");
    } else if (number == minPossibleResult) {
        result.addClass("nat-min-text");
    }
}

/**
 * Takes an array of rolls (ints), the minimum possible result, and the maximum possible result
 * and populates the "Advanced Results" section.
 **/
function setAdvancedResultsFromArray(arr, minPossibleResult, maxPossibleResult, includedModifier) {
    var table = document.getElementById("results-table");
    var sortedTable = document.getElementById("sorted-results-table");

    // clear the table
    table.innerHTML = "";

    if (config.sortAdvanced) {
        arr.sort(function(a, b){return b-a});
    }

    // populate table from array
    for (var i = arr.length - 1; i >= 0; i--) {

        var num = arr[i];
        var natRoll = num - includedModifier;

        var newRow = table.insertRow(0);

        //count column
        var countCell = newRow.insertCell(0);
        countCell.innerHTML = "#" + (i + 1);

        //roll column
        var rollCell = newRow.insertCell(-1);
        rollCell.innerHTML = natRoll;

        if (natRoll == maxPossibleResult) {
            rollCell.className += " nat-max";
        } else if (natRoll == minPossibleResult) {
            rollCell.className += " nat-min";
        }

        if (includedModifier != 0) {
            //mod column
            var rollModCell = newRow.insertCell(-1);
            rollModCell.innerHTML = num;

            if (natRoll == maxPossibleResult) {
                rollModCell.className += " nat-max";
            } else if (natRoll == minPossibleResult) {
                rollModCell.className += " nat-min";
            }
        }
    };

    var headerRow = table.insertRow(0);
    headerRow.insertCell(0).innerHTML = "Roll #";
    headerRow.insertCell(-1).innerHTML = "Roll";
    if (includedModifier != 0) {
        headerRow.insertCell(-1).innerHTML = "Roll Total";
    }

    // hide the min/max view if the array length == 1
    if (arr.length == 1) {
        $("#minmax-table").hide();
    } else {
        $("#minmax-table").show();
        var min = Math.min.apply(Math, arr);
        var max = Math.max.apply(Math, arr);
        setMinAndMax(min, max);
    }
}

function setMinAndMax(min, max) {
    $("#minmax-table-min").html(min);
    $("#minmax-table-max").html(max);
}

function toggleAdvanced() {
    if (advancedIsShown) {
        hideAdvanced();
    } else {
        showAdvanced();
    }
}

function showAdvanced() {
    $("#advanced").show();
    advancedIsShown = true;
}

function hideAdvanced() {
    $("#advanced").hide();
    advancedIsShown = false;
}

function hideAdvancedInit() {
    hideAdvanced();
    $("#minmax-table").hide();
    $("#toggle-advanced").hide();
}

/**
 * Returns the current RollConfig
 **/
function captureCurrentRollConfig() {
    var dieType = $("input[name=die-type]:checked").val();
    var modifier = $("#modifier").val();
    var numberOfRolls = $("#num-rolls").val();
    var modifierPerRoll = $("#modifierPerRoll").is(":checked")

    return new RollConfig(numberOfRolls, dieType, modifier, modifierPerRoll);
}
