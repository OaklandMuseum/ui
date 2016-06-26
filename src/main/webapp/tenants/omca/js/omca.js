var omca = {};
 
 (function ($, fluid) {

    // OMCA Check validity of ID value
    fluid.defaults("omca.checkIDValues", {
        gradeNames: ["fluid.viewComponent"],
        selectors: {
            currentIDValue: ".match-id",
            appURL: "../../../tenant/omca/PROCEDURE/search?query=",
            errorMatch: "matched-value-conflict"
        }
    });
    omca.checkIDValues = function(container, options) {
        var that = fluid.initView("omca.checkIDValues", container, options);
        var currentIDValueElem = that.locate("currentIDValue");
        var currentIDValueElemID = $(currentIDValueElem).attr("id");
        var getProcedure = $(".id-container").attr("id");
        var procedures = {
            "cataloging": "objectNumber", 
            "acquisition": "acquisitionReferenceNumber",
            "claim": "claimNumber",
            "conditioncheck": "conditionCheckRefNumber",
            "conservation": "conservationNumber",
            "exhibition": "exhibitionNumber",
            "intake": "entryNumber",
            "loanin": "loanInNumber",
            "loanout": "loanOutNumber",
            "media": "identificationNumber",
            "movement": "movementReferenceNumber",
            "objectexit": "exitNumber",
            "restrictedmedia": "identificationNumber",
            "valuationcontrol": "valuationcontrolRefNumber"
        }
        
        if (currentIDValueElem && currentIDValueElem.length) {

            // Add message span to parent container of id field
            var spanHTML = '<span id="cs-id-message-box" class="arrow-up" style="display:none;"></span>';
            $(currentIDValueElem).parents(".info-pair").eq(0).append(spanHTML);
            var messageBox = $("#cs-id-message-box");

            var url = that.options.selectors.appURL.replace("PROCEDURE", getProcedure);

            var originalIDValue = $(currentIDValueElem).val();
            var updatedIDValue = "";
            console.log("checkIDValue original: " + originalIDValue);

            var success = function(data){
                updatedIDValue = $(currentIDValueElem).val();
                console.log("retrieved data length: " + data["results"].length);
                if (data["results"].length && updatedIDValue != originalIDValue){
                    console.log("Matched record with ID (" + updatedIDValue + ") with CSID: " + data["results"][0]["csid"]);
                    $(currentIDValueElem).addClass(that.options.selectors.errorMatch);
                    $(messageBox).html("The ID number <a target='_blank' href='" + getProcedure + ".html?csid=" + data["results"][0]["csid"] + "'>("+ updatedIDValue + ")</a> is already in use.").show();
                } else {
                    console.log("there is no record with matching ID: " + updatedIDValue);
                    $(currentIDValueElem).removeClass(that.options.selectors.errorMatch);
                    $(messageBox).html("").hide();
                }
            }

            var printError = function( req, status, err ) {
                console.log("something went wrong", status, err );
            };

            // Add event handler when input field value changes
            $(currentIDValueElemID).change(function() {
                // only trigger if we know the ID name of the procedure
                if(procedures.hasOwnProperty(getProcedure)){
                    var updatedIDValue = $(currentIDValueElem).val();
                    console.log("checkIDValue updated: " + updatedIDValue);

                    // Check to see if updatedIDValue already exists
                    if (updatedIDValue && updatedIDValue != "" && updatedIDValue.length){
                        $.ajax({
                            url: url,
                            type: "POST",
                            dataType: "json",
                            data: '{"fields":{"' + procedures[getProcedure] + '":[{"_primary":true,"' + procedures[getProcedure] + '":"'+updatedIDValue+'"}]},"operation":"or"}',
                            success: success,
                            error: printError
                        }).fail(function() {
                            console.log("error retrieving data");
                        });
                    }
                }

            });
        }

        console.log("checkIDValue done.");
        return that;
    };

    var zeroPad = function(str, len){
        if (str.length >= len) {
            return (str);
        }
        
        return (new Array(len + 1).join('0') + str).slice(-len);
    };

    var testHasInitialNumberExp = /^\d+.*$/;
    var testHasInitialLetterExp = /^\D+.*$/;
    var hasInitialNumberExp = /^(\d+)(.*)$/;
    var hasInitialLetterExp = /^(\D+)(.*)$/;

    omca.computeSortableObjectNumber = function(objectNumber) {
        var parts = objectNumber.split('.');
        var sortableParts = [];

        for (var i=0; i<parts.length; i++) {
            var part = parts[i];

            if (testHasInitialNumberExp.test(part)) {
                var foo = part.match(hasInitialNumberExp);
                console.log("part(#):" + foo);
                if (foo && foo.length > 2) {
                    part = zeroPad(foo[1], 10) + foo[2];
                }
            } else if (testHasInitialLetterExp.test(part)) {
                var foo = part.match(hasInitialLetterExp);
                console.log("part(a):" + foo);
                if (foo && foo.length > 2) {
                    part = foo[1] + zeroPad(foo[2], 10);
                }
            } else {
                console.log("no match");
            }
            
            sortableParts.push(part);
        }
        
        var sortableObjectNumber = sortableParts.join('.');
        console.log("sortable parts: " + sortableObjectNumber);
        return sortableObjectNumber;
    }

    // Utility to clone a field's value.
    // Used in computedCurrentLocationDisplay
    omca.cloneField = function(field) {
        var clonedAndDeURNed = cspace.util.urnToString(field);
        console.log("cloned field: " + clonedAndDeURNed);
        return clonedAndDeURNed;
    }

    // Test to see if a value is a URN
    var isURN = function(field){
        if(!field) {
            return false;
        }

        var hasURNPrefix = /^urn:cspace:/;
        if (field.match(hasURNPrefix)) {
            return true;
        }
        return false;
    }

    // Utility to merge multiple fields.
    // Used in computed summary fields
    omca.mergeFields = function() {
        var mergedFields = "";
        var myFields = [];
        var j = 0;

        for (var i = 0; i < arguments.length; i++) {
            // Copy over fields that aren't empty
            if(arguments[i] && arguments[i].length){
                // Convert URNs into strings
                if(isURN(arguments[i])) {
                    myFields[j++] = cspace.util.urnToString(arguments[i]);
                } else {
                    myFields[j++] = arguments[i];
                }
            }
        }
        
        mergedFields = myFields.join(" - ");
        console.log("merged fields: " + mergedFields);
        return mergedFields;
    }

    // Utility that returns a formatted "clean" date for display from a search results list
    omca.cleanSearchResultsDateDisplay = function(list){
        // match against the date + hour:minutes
        var getTimeStamp = /^(.*T\d\d:\d\d).*Z$/;

        fluid.each(list, function (row, index) {
            if (row.summarylist && row.summarylist.updatedAt && row.summarylist.updatedAt.length){
                var dateMatch = row.summarylist.updatedAt.match(getTimeStamp);
                if (dateMatch && dateMatch.length > 1) {
                    console.log("cleanDateDisplay for " + row.summary + ": " + dateMatch[1]);
                    row.summarylist.updatedAt = dateMatch[1];
                }
            }
        });
        return list;
    }

    // Utility that returns a custom sorted list of Record names
    omca.customTabOrder = function(originalOrder){
        var customOrder = [
            "acquisition", 
            "cataloging", 
            "movement", 
            "conditioncheck", 
            "conservation", 
            "loanin", 
            "loanout", 
            "media", 
            "exhibition", 
            "valuationcontrol", 
            "group", 
            "intake",  
            "objectexit",
            "restrictedmedia",
            "claim"
        ];

        // make sure our lists match
        // TODO: if the original list is larger than the custom then append any unmatched record names to our custom
        if (originalOrder.length != customOrder.length){
            console.log("omca.customTabArray: original tabs list and custom tabs lists do not have the same length.");
            console.log("original list: " + originalOrder);
            console.log("custom list:   " + customOrder);
            return originalOrder;
        } 
        return customOrder;
    }

    /* Borrowed from Ray Lee's work on BAMPFA-207  */
    omca.computeDimensionSummary = function(measuredPart, dimensionSubGroup, measuredPartNote) {
        var valueMap = {};
        var unitMap = {};

        var measurementUnitAbbr = {
            "inches": "in", 
            "meters": "m", 
            "centimeters": "cm", 
            "cubic centimeters": "cm3", 
            "feet": "ft", 
            "kilograms": "kg", 
            "liters": "l", 
            "millimeters": "mm", 
            "minutes": "mins", 
            "ounces": "oz",
            "pixels": "px", 
            "pixels per inch": "ppi", 
            "pounds": "lbs", 
            "square feet": "ft2", 
            "stories": "stories",
            "troy ounces": "oz t", 
            "yards": "yd"
        }
        
        for (var i=0; i<dimensionSubGroup.length; i++) {
            var measurement = dimensionSubGroup[i];
            var dimension = measurement.dimension;
            var value = measurement.value;
            var unit = cspace.util.urnToString(measurement.measurementUnit);
            
            if (value != null && value != "" && !(dimension in valueMap)) {
                valueMap[dimension] = value;

                if (measurementUnitAbbr.hasOwnProperty(unit)){
                    unitMap[dimension] = " " + measurementUnitAbbr[unit];
                } else if (unit.length < 1) {
                    // default to "inches" if there is no unit set
                    unitMap[dimension] = " " + measurementUnitAbbr["inches"];
                } else {
                    unitMap[dimension] = " " + unit;
                }
                //console.log("unit: " + unit + "; unit abbr: " + unitMap[dimension]);
            }
        }

        var orderedDimensions = {"height": "H: ", "width": "W: ", "depth": "D: ", "diameter": "Dia: "};
        var orderedValues = [];

        for (dimension in orderedDimensions){
            if(orderedDimensions.hasOwnProperty(dimension) && (dimension in valueMap)) {
                var dimensionDisplay = orderedDimensions[dimension] + valueMap[dimension] + unitMap[dimension];
                orderedValues.push(dimensionDisplay);
            }
        }
        
        var dimensionSummary = orderedValues.join(", ");
        var summaryParts = [];
        
        /*if (measuredPart != null && measuredPart != "") {
            summaryParts.push(cspace.util.urnToString(measuredPart) + ":");
        }*/

        if (dimensionSummary != "") {
            summaryParts.push(dimensionSummary);
        }
        
        /*if (measuredPartNote != null && measuredPartNote != "") {
            summaryParts.push("(" + measuredPartNote + ")");
        }*/
        
        //return summaryParts.join(" ");
        return summaryParts;
    }

})(jQuery, fluid);