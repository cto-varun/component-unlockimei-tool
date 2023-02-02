"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = UnlockImei;
var _react = _interopRequireWildcard(require("react"));
var _reactRouterDom = require("react-router-dom");
var _shortid = _interopRequireDefault(require("shortid"));
var _moment = _interopRequireDefault(require("moment"));
var _antd = require("antd");
var _checkValidity = require("../../component-unlockimei-tool/src/helpers/checkValidity");
var _componentMessageBus = require("@ivoyant/component-message-bus");
require("./styles.css");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
// Only HQ profiles can force override
const validProfilesForOverride = ['CAREHQCST', 'CALLCTRMGR', 'CASEREVIEW'];
const columns = [{
  title: 'IMEI',
  dataIndex: 'imei',
  key: 'imei'
}, {
  title: 'Device',
  dataIndex: 'device',
  key: 'device'
}, {
  title: 'BAN',
  dataIndex: 'ban',
  key: 'ban'
}, {
  title: 'CTN',
  dataIndex: 'ctn',
  key: 'ctn'
}, {
  title: 'Line Status',
  key: 'tags',
  dataIndex: 'tags',
  render: (_, _ref) => {
    let {
      tags
    } = _ref;
    return /*#__PURE__*/_react.default.createElement(_react.default.Fragment, null, tags.map(tag => {
      let color = '';
      let tagName = '';
      if (tag === 'A') {
        color = 'green';
        tagName = 'ACTIVE';
      } else if (tag === 'S') {
        color = 'orange';
        tagName = 'SUSPENDED';
      } else {
        color = 'red';
        tagName = 'CANCELED';
      }
      return /*#__PURE__*/_react.default.createElement(_antd.Tag, {
        color: color,
        key: tag
      }, tagName);
    }));
  }
}];
const getTableData = customersData => {
  const columnData = customersData && customersData.map((dataItem, i) => {
    return {
      key: dataItem?.billingAccountNumber,
      imei: dataItem?.device?.imei,
      device: dataItem?.device?.model,
      ban: dataItem?.billingAccountNumber,
      ctn: dataItem?.ctn,
      tags: [dataItem?.subscriberStatus]
    };
  });
  return columnData;
};
function UnlockImei(_ref2) {
  let {
    visible,
    setShowUnlockImei,
    datasources,
    properties,
    metadataProfile,
    unlockOverrideReasons
  } = _ref2;
  let {
    attId,
    profile
  } = window[window.sessionStorage?.tabId].COM_IVOYANT_VARS;
  const unlockOverrideInfo = metadataProfile?.profiles?.find(_ref3 => {
    let {
      name
    } = _ref3;
    return name === profile;
  })?.categories?.find(_ref4 => {
    let {
      name
    } = _ref4;
    return name === 'deviceUnlockOverride';
  }) || {};
  const overrideReasons = unlockOverrideReasons?.deviceUnlockOverrideReasons?.find(_ref5 => {
    let {
      reasons
    } = _ref5;
    return reasons;
  })?.reasons;
  const history = (0, _reactRouterDom.useHistory)();
  const {
    NEW_CTN: ctn,
    NEW_BAN: ban
  } = window[window.sessionStorage?.tabId];
  const {
    Option
  } = _antd.Select;
  const {
    Text
  } = _antd.Typography;
  const [form] = _antd.Form.useForm();
  const unlockImeikSearchWorkflow = properties?.unlockImeikSearchWorkflow;
  const unlockImeikDevicehWorkflow = properties?.unlockImeikDevicehWorkflow;
  const {
    workflow: imeiSearchWorkflow,
    datasource: imeiSearchDatasource,
    errorStates: imeiSearchErrorStates,
    successStates: imeiSearchSuccessStates,
    responseMapping: imeiSearchResponseMapping
  } = unlockImeikSearchWorkflow;
  const {
    workflow: imeiUnlockDeviceWorkflow,
    datasource: imeiUnlockDeviceDatasource,
    errorStates: imeiUnlockDeviceErrorStates,
    successStates: imeiUnlockDeviceSuccessStates,
    responseMapping: imeiUnlockDeviceResponseMapping
  } = unlockImeikDevicehWorkflow;
  const [errMessage, setErrMessage] = (0, _react.useState)(null);
  const [loadingSearch, setLoadingSearch] = (0, _react.useState)(false);
  const [loadingUnlock, setLoadingUnlock] = (0, _react.useState)(false);
  const [imeiSearchData, setImeiSearchData] = (0, _react.useState)(undefined);
  const [deviceUnlockData, setDeviceUnlockData] = (0, _react.useState)(undefined);
  const [unlockMessage, setUnlockMessage] = (0, _react.useState)(undefined);
  const [showUnlockButton, setShowUnlockButton] = (0, _react.useState)(true);
  const [showOtherReasonInput, setShowOtherReasonInput] = (0, _react.useState)(false);
  let [unlockDevicePayload, setUnlockDevicePayload] = (0, _react.useState)({
    imei: '',
    overrideTenure: false,
    overrideReason: null,
    overrideReasonDetails: null,
    ban: '',
    ctn: ''
  });
  const [imeiNotFound, setImeiNotFound] = (0, _react.useState)(false);
  const [imeiSearched, setImeiSearched] = (0, _react.useState)(undefined);
  const [showOverrideButton, setShowOverrideButton] = (0, _react.useState)(true);
  const [showOverrideOptions, setShowOverrideOptions] = (0, _react.useState)(true);
  const [disableOverrideButton, setDisableOverrideButton] = (0, _react.useState)(true);
  const imeiUnlockInfo = imeiSearchData && imeiSearchData?.find(_ref6 => {
    let {
      device
    } = _ref6;
    return device;
  })?.device?.unlockInfo;
  const tableData = getTableData(imeiSearchData);
  const handleImeiSearchResponse = (subscriptionId, topic, eventData, closure) => {
    const state = eventData.value;
    const isSuccess = imeiSearchSuccessStates.includes(state);
    const isFailure = imeiSearchErrorStates.includes(state);
    if (isSuccess || isFailure) {
      if (isSuccess) {
        setImeiSearchData(eventData?.event?.data?.data);
        setErrMessage(null);
      }
      if (isFailure) {
        // Code = NOT_FOUND is used for archived BANs also as they won't be in table
        if (eventData?.event?.data?.response?.data?.code === 'NOT_FOUND') {
          setImeiNotFound(true);
          setDeviceUnlockData({
            deviceUnlocked: false
          });
        }
        if (eventData?.event?.data?.response?.data?.causedBy) {
          setErrMessage(eventData?.event?.data?.response?.data?.causedBy[0]?.message);
        } else {
          setErrMessage(eventData?.event?.data?.response?.data?.message);
        }
      }
      setLoadingSearch(false);
      _componentMessageBus.MessageBus.unsubscribe(subscriptionId);
    }
  };
  const onFinish = values => {
    if (values !== undefined && values !== '') {
      // if imeiNotFound flag is true -> reset it to false
      if (imeiNotFound) {
        setImeiNotFound(false);
        setDeviceUnlockData(undefined);
      }

      // update a state value that keeps track of current Imei
      setImeiSearched(values.imei);
      setLoadingSearch(true);
      const submitEvent = 'SUBMIT';
      _componentMessageBus.MessageBus.send('WF.'.concat(imeiSearchWorkflow).concat('.INIT'), {
        header: {
          registrationId: imeiSearchWorkflow,
          workflow: imeiSearchWorkflow,
          eventType: 'INIT'
        }
      });
      _componentMessageBus.MessageBus.subscribe(imeiSearchWorkflow, 'WF.'.concat(imeiSearchWorkflow).concat('.STATE.CHANGE'), handleImeiSearchResponse);
      _componentMessageBus.MessageBus.send('WF.'.concat(imeiSearchWorkflow).concat('.').concat(submitEvent), {
        header: {
          registrationId: imeiSearchWorkflow,
          workflow: imeiSearchWorkflow,
          eventType: submitEvent
        },
        body: {
          datasource: datasources[imeiSearchDatasource],
          request: {
            params: {
              imei: values.imei
            }
          },
          imeiSearchResponseMapping
        }
      });
    }
  };
  const onFinishFailed = errorInfo => {
    console.log('Failed:', errorInfo);
  };
  const handleDeviceUnlockResponse = (subscriptionId, topic, eventData, closure) => {
    const state = eventData.value;
    const isSuccess = imeiUnlockDeviceSuccessStates.includes(state);
    const isFailure = imeiUnlockDeviceErrorStates.includes(state);
    if (isSuccess || isFailure) {
      if (isSuccess) {
        setDeviceUnlockData(eventData?.event?.data?.data);
        if (eventData?.event?.data?.data?.unlockCode !== undefined && eventData?.event?.data?.data?.unlockCode !== '') {
          setUnlockMessage(`${eventData?.event?.data?.data?.message} Unlock code is ${eventData?.event?.data?.data?.unlockCode}`);
        } else {
          setUnlockMessage(eventData?.event?.data?.data?.message);
        }
        setShowUnlockButton(false);
        setErrMessage(null);

        // do not show override button when unlock is successfull
        if (eventData?.event?.data?.data?.deviceUnlocked) {
          setShowOverrideButton(false);
          setShowOverrideOptions(false);
        }
      }
      if (isFailure) {
        if (eventData?.event?.data?.response?.data?.causedBy) {
          setErrMessage(eventData?.event?.data?.response?.data?.causedBy[0]?.message);
        } else {
          setErrMessage(eventData?.event?.data?.response?.data?.message);
        }
      }
      setLoadingUnlock(false);
      _componentMessageBus.MessageBus.unsubscribe(subscriptionId);
    }
  };
  const getDeviceUnlockInfo = () => {
    setLoadingUnlock(true);
    const submitEvent = 'SUBMIT';
    _componentMessageBus.MessageBus.send('WF.'.concat(imeiUnlockDeviceWorkflow).concat('.INIT'), {
      header: {
        registrationId: imeiUnlockDeviceWorkflow,
        workflow: imeiUnlockDeviceWorkflow,
        eventType: 'INIT'
      }
    });
    _componentMessageBus.MessageBus.subscribe(imeiUnlockDeviceWorkflow, 'WF.'.concat(imeiUnlockDeviceWorkflow).concat('.STATE.CHANGE'), handleDeviceUnlockResponse);
    _componentMessageBus.MessageBus.send('WF.'.concat(imeiUnlockDeviceWorkflow).concat('.').concat(submitEvent), {
      header: {
        registrationId: imeiUnlockDeviceWorkflow,
        workflow: imeiUnlockDeviceWorkflow,
        eventType: submitEvent
      },
      body: {
        datasource: datasources[imeiUnlockDeviceDatasource],
        request: {
          body: unlockDevicePayload
        },
        imeiUnlockDeviceResponseMapping
      }
    });
  };
  const overrideDeviceUnlockInfo = () => {
    // Construct payload without BAN and CTN and make unlock call.
    const requestPayloadWithoutBanCtn = {
      ...unlockDevicePayload
    };
    delete requestPayloadWithoutBanCtn.ban;
    delete requestPayloadWithoutBanCtn.ctn;
    setLoadingUnlock(true);
    const submitEvent = 'SUBMIT';

    // Use message bus api call system and handle response accordingly
    _componentMessageBus.MessageBus.send('WF.'.concat(imeiUnlockDeviceWorkflow).concat('.INIT'), {
      header: {
        registrationId: imeiUnlockDeviceWorkflow,
        workflow: imeiUnlockDeviceWorkflow,
        eventType: 'INIT'
      }
    });
    _componentMessageBus.MessageBus.subscribe(imeiUnlockDeviceWorkflow, 'WF.'.concat(imeiUnlockDeviceWorkflow).concat('.STATE.CHANGE'), handleDeviceUnlockResponse);
    _componentMessageBus.MessageBus.send('WF.'.concat(imeiUnlockDeviceWorkflow).concat('.').concat(submitEvent), {
      header: {
        registrationId: imeiUnlockDeviceWorkflow,
        workflow: imeiUnlockDeviceWorkflow,
        eventType: submitEvent
      },
      body: {
        datasource: datasources[imeiUnlockDeviceDatasource],
        request: {
          body: requestPayloadWithoutBanCtn
        },
        imeiUnlockDeviceResponseMapping
      }
    });
  };
  const handleReasonChange = value => {
    setUnlockDevicePayload(prev => {
      return {
        ...prev,
        imei: imeiSearched,
        overrideTenure: true,
        overrideReason: value
      };
    });
    if (value.toLowerCase() === 'other') {
      setShowOtherReasonInput(true);
      setDisableOverrideButton(true);
    } else {
      setShowOtherReasonInput(false);
      setDisableOverrideButton(false);
    }
  };
  const handleUnlockImeiToolVisibility = () => {
    setShowUnlockImei(true);
  };
  const handleOtherReasonChange = e => {
    if (e.target.value) {
      setDisableOverrideButton(false);
    } else {
      setDisableOverrideButton(true);
    }
    setUnlockDevicePayload(prev => {
      return {
        ...prev,
        overrideTenure: true,
        overrideReasonDetails: e?.target?.value
      };
    });
  };
  const lineSubscriberStatus = imeiSearchData && imeiSearchData?.find(_ref7 => {
    let {
      subscriberStatus
    } = _ref7;
    return subscriberStatus;
  })?.subscriberStatus;
  function unlockImeiModalFooter() {
    let footer = [];
    let authanticateButton = /*#__PURE__*/_react.default.createElement(_antd.Tooltip, {
      title: imeiUnlockInfo?.allowUnlock ? null : imeiUnlockInfo?.resourceStatus
    }, /*#__PURE__*/_react.default.createElement(_antd.Button, {
      type: imeiUnlockInfo?.allowUnlock ? 'primary' : 'ghost',
      disabled: !imeiUnlockInfo?.allowUnlock,
      onClick: () => {
        setShowUnlockImei(false);
        history.push('/dashboards/cust-auth', {
          routeData: {
            imeiData: imeiSearchData[0],
            searchType: 'Account'
          }
        });
      }
    }, "AUTHENTICATE"));
    let ovierrideButton = /*#__PURE__*/_react.default.createElement(_react.default.Fragment, null, showOverrideButton && /*#__PURE__*/_react.default.createElement(_antd.Button, {
      type: disableOverrideButton ? 'ghost' : 'primary',
      onClick: () => {
        if (imeiNotFound) {
          overrideDeviceUnlockInfo();
        } else {
          getDeviceUnlockInfo();
        }
      },
      disabled: disableOverrideButton,
      loading: loadingUnlock
    }, "OVERRIDE & UNLOCK"));
    let unlockButton = /*#__PURE__*/_react.default.createElement(_antd.Tooltip, {
      title: imeiUnlockInfo?.allowUnlock ? null : imeiUnlockInfo?.resourceStatus
    }, /*#__PURE__*/_react.default.createElement(_antd.Button, {
      type: imeiUnlockInfo?.allowUnlock ? 'primary' : 'ghost',
      disabled: !imeiUnlockInfo?.allowUnlock,
      loading: loadingUnlock,
      onClick: () => getDeviceUnlockInfo()
    }, "UNLOCK DEVICE"));
    let closeButton = /*#__PURE__*/_react.default.createElement(_antd.Button, {
      type: "default",
      onClick: () => handleUnlockImeiClose()
    }, "CLOSE");
    if (imeiSearchData) {
      if (lineSubscriberStatus === 'A' || lineSubscriberStatus === 'S') {
        footer.push(authanticateButton);
      } else if (lineSubscriberStatus === 'C' && !deviceUnlockData?.deviceUnlocked) {
        if (unlockOverrideInfo?.enable && showOverrideOptions) {
          footer.push(ovierrideButton);
        } else if (showUnlockButton) {
          footer.push(unlockButton);
        }
      }
      footer.push(closeButton);
    } else if (imeiNotFound && unlockOverrideInfo?.enable && validProfilesForOverride.includes(profile)) {
      // IMEI not found and device unlock override is enabled
      // add buttons to footer
      footer.push(ovierrideButton);
      footer.push(closeButton);
    } else {
      return null;
    }
    return footer;
  }
  (0, _react.useEffect)(() => {
    _componentMessageBus.MessageBus.subscribe('SHOW_UNLOCKIMEI_TOOL', 'SHOW_UNLOCKIMEI_TOOL', handleUnlockImeiToolVisibility);
    return () => {
      _componentMessageBus.MessageBus.unsubscribe('SHOW_UNLOCKIMEI_TOOL');
    };
  }, []);
  (0, _react.useEffect)(() => {
    if (imeiSearchData) {
      setUnlockDevicePayload(prev => {
        return {
          ...prev,
          imei: tableData[0]?.imei,
          ban: tableData[0]?.ban,
          ctn: tableData[0]?.ctn
        };
      });
    }
  }, [imeiSearchData]);
  const resetAll = () => {
    setImeiSearchData(undefined);
    setDeviceUnlockData(undefined);
    setShowUnlockButton(true);
    setShowOtherReasonInput(false);
    form.resetFields();
    setErrMessage(null);
    setUnlockMessage(undefined);
    setImeiNotFound(false);
    setImeiSearched(undefined);
    setShowOverrideButton(true);
    setShowOverrideOptions(true);
    setDisableOverrideButton(true);
  };
  const handleUnlockImeiClose = () => {
    setShowUnlockImei(false);
    resetAll();
  };
  return /*#__PURE__*/_react.default.createElement(_react.default.Fragment, null, /*#__PURE__*/_react.default.createElement(_antd.Modal, {
    className: "unlock-imei-modal",
    title: 'Unlock IMEI',
    open: visible,
    onOk: () => handleUnlockImeiClose(),
    onCancel: () => handleUnlockImeiClose(),
    width: 750,
    footer: unlockImeiModalFooter(),
    forceRender: true,
    centered: true
  }, /*#__PURE__*/_react.default.createElement("article", {
    className: "imei-unlock-tool"
  }, !deviceUnlockData?.deviceUnlocked && /*#__PURE__*/_react.default.createElement("p", null, "Please search for the IMEI number you wish to unlock. IMEI's that are ACTIVE or SUSPENDED on an account must be authenticated before proceeding to unlock device."), !deviceUnlockData?.deviceUnlocked && /*#__PURE__*/_react.default.createElement("div", {
    className: "mg-b--16"
  }, /*#__PURE__*/_react.default.createElement(_antd.Form, {
    form: form,
    name: "basic",
    layout: "inline",
    initialValues: {
      remember: false,
      initialValue: ''
    },
    onFinish: onFinish,
    onFinishFailed: onFinishFailed,
    autoComplete: "off"
  }, /*#__PURE__*/_react.default.createElement(_antd.Form.Item, {
    name: "imei",
    normalize: value => value.replace(/[^0-9]/gi, ''),
    rules: [{
      required: true,
      validateTrigger: 'onBlur',
      validator: _checkValidity.customInputValidator
    }]
  }, /*#__PURE__*/_react.default.createElement(_antd.Input, {
    allowClear: true,
    placeholder: "Search IMEI"
  })), /*#__PURE__*/_react.default.createElement(_antd.Form.Item, null, /*#__PURE__*/_react.default.createElement(_antd.Button, {
    type: "primary",
    htmlType: "submit",
    loading: loadingSearch
  }, "SEARCH")))), imeiSearchData && /*#__PURE__*/_react.default.createElement(_antd.Table, {
    columns: columns,
    dataSource: tableData,
    pagination: false,
    className: "mg-b--16"
  }), deviceUnlockData && !errMessage && /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement(_antd.Alert, {
    message: unlockMessage,
    type: deviceUnlockData?.deviceUnlocked ? 'success' : 'error',
    showIcon: true
  })), errMessage && /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement(_antd.Alert, {
    message: errMessage && errMessage,
    type: "error",
    showIcon: true
  })), unlockOverrideInfo?.enable && lineSubscriberStatus === 'C' && showOverrideOptions && imeiSearchData && /*#__PURE__*/_react.default.createElement(_react.default.Fragment, null, /*#__PURE__*/_react.default.createElement(_antd.Row, {
    justify: "around"
  }, /*#__PURE__*/_react.default.createElement(_antd.Col, {
    className: "modal-grid-child",
    span: 8
  }, /*#__PURE__*/_react.default.createElement(_antd.Select, {
    placeholder: "Select reason for override",
    style: {
      width: 200
    },
    onChange: handleReasonChange,
    className: "mg-t--16"
  }, overrideReasons && overrideReasons?.map((reason, i) => {
    return /*#__PURE__*/_react.default.createElement(Option, {
      key: i,
      value: reason
    }, reason);
  }))), /*#__PURE__*/_react.default.createElement(_antd.Col, {
    className: "modal-grid-child",
    span: 16
  }, showOtherReasonInput && /*#__PURE__*/_react.default.createElement(_antd.Input, {
    allowClear: true,
    placeholder: "Enter reason for override",
    onChange: handleOtherReasonChange
  })))))));
}
module.exports = exports.default;