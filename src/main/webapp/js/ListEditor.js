/*
Copyright 2010 University of Toronto

Licensed under the Educational Community License (ECL), Version 2.0. 
ou may not use this file except in compliance with this License.

You may obtain a copy of the ECL 2.0 License at
https://source.collectionspace.org/collection-space/LICENSE.txt
*/

/*global jQuery, fluid, cspace*/
"use strict";

cspace = cspace || {};

(function ($, fluid) {

    var hideDetails = function (domBinder) {
        domBinder.locate("details").hide();
        domBinder.locate("detailsNone").show();
        domBinder.locate("newListRow").hide();
    };
    
    var showDetails = function (domBinder, newDetails) {
        domBinder.locate("detailsNone").hide();
        domBinder.locate("details").show();
        if (newDetails) {
            domBinder.locate("newListRow").show();
            domBinder.locate("hideOnCreate").hide();
            domBinder.locate("hideOnEdit").show();
        } else {
            domBinder.locate("newListRow").hide();
            domBinder.locate("hideOnEdit").hide();
            domBinder.locate("hideOnCreate").show();
        }
    };
    
    var bindEventHandlers = function (that) {

        that.detailsDC.events.afterSave.addListener(function () {
            that.options.updateList(that, that.list.refreshView);
        });
        that.detailsDC.events.afterCreate.addListener(function () {
            that.locate("newListRow").hide();
        });
        that.detailsDC.events.afterRemove.addListener(function () {
            hideDetails(that.dom);
            cspace.util.hideMessage(that.dom);
        });
        that.detailsDC.events.onError.addListener(function (operation, message) {
            that.locate("newListRow").hide();
        });
        
        that.details.events.afterRender.addListener(function () {
            showDetails(that.dom, false);
        });
        that.details.events.onCancel.addListener(function () {
            hideDetails(that.dom);
        });
        
        that.list.events.onSelect.addListener(function (model) {
            that.options.loadDetails(model, that.detailsDC);
        });
        
        that.locate("addNewListRowButton").click(that.addNewListRow);
    };
    
    var setUpListEditor = function (that) {
        that.locate("newListRow").hide();
        bindEventHandlers(that);
        that.events.pageReady.fire();
    };
    
    cspace.listEditor = function (container, recordType, uispec, options) {
        var that = fluid.initView("cspace.listEditor", container, options);
        that.recordType = recordType;
        that.uispec = uispec;
        that.model = {
            list: [],
            details: {}
        };

        that.detailsApplier = fluid.makeChangeApplier(that.model.details);
        that.detailsDC = fluid.initSubcomponent(that, "dataContext", [that.model.details, fluid.COMPONENT_OPTIONS]);
        that.details = fluid.initSubcomponent(that, "details", [
            $(that.options.selectors.details, that.container),
            that.detailsDC,
            that.detailsApplier,
            that.uispec.details,
            fluid.COMPONENT_OPTIONS
        ]);
        hideDetails(that.dom);
        
        /**
         * addNewListRow - add an empty row to the list and display cleared and ready for editing details.
         */
        that.addNewListRow = function () {
            fluid.model.copyModel(that.model.details, {});
            that.details.refreshView();
            showDetails(that.dom, true);
            that.events.afterAddNewListRow.fire();
        };
        
        that.refreshView = function () {
            that.list.refreshView();
            hideDetails(that.dom);
        };

        that.options.initList(that, function () {
            that.list = fluid.initSubcomponent(that, "list", [
                $(that.options.selectors.list, container),
                {
                    items: that.model.list,
                    selectionIndex: -1
                },
                that.uispec.list,
                fluid.COMPONENT_OPTIONS
            ]);
            setUpListEditor(that);
        });
        return that;
    };

    /*
     * A strategy for providing data to populate the 'list' portion of the ListEditor model.
     * This strategy fetches the data from the server. 
     * @param {Object} listEditor   The ListEdior component
     * @param {Function} callback   An optional callback function that will be called on success
     */
    cspace.listEditor.fetchData = function (listEditor, callback) {
        $.ajax({
            url: listEditor.options.baseUrl + listEditor.recordType,
            dataType: "json",
            success: function (data) {
                fluid.model.copyModel(listEditor.model.list, data.items);
                if (callback) {
                    callback();
                }
            }
        });
    };

    /*
     * A strategy for providing data to populate the 'list' portion of the ListEditor model.
     * This strategy extracts data from an option. 
     * @param {Object} listEditor   The ListEdior component
     * @param {Function} callback   An optional callback function that will be called on success
     */
    cspace.listEditor.receiveData = function (listEditor, callback) {
        fluid.model.copyModel(listEditor.model.list, listEditor.options.data);
        if (callback) {
            callback();
        }
    };
    
    /*
     * A strategy for providing data to populate the 'details' portion of the ListEditor model.
     * This strategy uses the DataContext to fetch the information. 
     * @param {Object} model        A data model
     * @param {Object} detailsDC    The DataContext used for the 'details' section of the component
     */
    cspace.listEditor.loadDetails = function (model, detailsDC) {
        detailsDC.fetch(model.items[model.selectionIndex].csid);
    };

    fluid.defaults("cspace.listEditor", {
        list: {
            type: "cspace.recordList"
        },
        details: {
            type: "cspace.recordEditor"
        },
        dataContext: {
            type: "cspace.dataContext",
            options: {
                recordType: "",
                dataType: "json",
                fileExtension: ""
            }
        },
        selectors: {
            messageContainer: ".csc-message-container",
            feedbackMessage: ".csc-message",
            timestamp: ".csc-timestamp",
            list: ".csc-listEditor-list",
            csid: ".csc-listEditor-list-csid",
            listRow: ".csc-listEditor-list-row",
            details: ".csc-listEditor-details",
            detailsNone: ".csc-listEditor-details-none",
            newListRow: ".csc-listEditor-addNew",
            hideOnCreate: ".csc-details-hideOnCreate",
            hideOnEdit: ".csc-details-hideOnEdit",
            addNewListRowButton: ".csc-listEditor-createNew"
        },
        events: {
            pageReady: null,
            afterAddNewListRow: null
        },
        
        // strategies:
        loadDetails: cspace.listEditor.loadDetails,
        initList: cspace.listEditor.fetchData,
        updateList: cspace.listEditor.fetchData,

        baseUrl: "../../chain/", // used by the cspace.listEditor.fetchData strategy
        data: [] // used by the cspace.listEditor.receiveData strategy
    });

})(jQuery, fluid);