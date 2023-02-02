import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import shortid from 'shortid';
import moment from 'moment';
import {
    Modal,
    Row,
    Col,
    Select,
    Button,
    Typography,
    notification,
    Input,
    Space,
    Table,
    Tag,
    Alert,
    Form,
    Tooltip,
} from 'antd';

import { customInputValidator } from '../../component-unlockimei-tool/src/helpers/checkValidity';
import { MessageBus } from '@ivoyant/component-message-bus';
import './styles.css';

// Only HQ profiles can force override
const validProfilesForOverride = ['CAREHQCST', 'CALLCTRMGR', 'CASEREVIEW'];

const columns = [
    {
        title: 'IMEI',
        dataIndex: 'imei',
        key: 'imei',
    },
    {
        title: 'Device',
        dataIndex: 'device',
        key: 'device',
    },
    {
        title: 'BAN',
        dataIndex: 'ban',
        key: 'ban',
    },
    {
        title: 'CTN',
        dataIndex: 'ctn',
        key: 'ctn',
    },
    {
        title: 'Line Status',
        key: 'tags',
        dataIndex: 'tags',
        render: (_, { tags }) => (
            <>
                {tags.map((tag) => {
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

                    return (
                        <Tag color={color} key={tag}>
                            {tagName}
                        </Tag>
                    );
                })}
            </>
        ),
    },
];

const getTableData = (customersData) => {
    const columnData =
        customersData &&
        customersData.map((dataItem, i) => {
            return {
                key: dataItem?.billingAccountNumber,
                imei: dataItem?.device?.imei,
                device: dataItem?.device?.model,
                ban: dataItem?.billingAccountNumber,
                ctn: dataItem?.ctn,
                tags: [dataItem?.subscriberStatus],
            };
        });

    return columnData;
};

export default function UnlockImei({
    visible,
    setShowUnlockImei,
    datasources,
    properties,
    metadataProfile,
    unlockOverrideReasons,
}) {
    let { attId, profile } = window[
        window.sessionStorage?.tabId
    ].COM_IVOYANT_VARS;

    const unlockOverrideInfo =
        metadataProfile?.profiles
            ?.find(({ name }) => name === profile)
            ?.categories?.find(({ name }) => name === 'deviceUnlockOverride') ||
        {};

    const overrideReasons = unlockOverrideReasons?.deviceUnlockOverrideReasons?.find(
        ({ reasons }) => {
            return reasons;
        }
    )?.reasons;

    const history = useHistory();

    const { NEW_CTN: ctn, NEW_BAN: ban } = window[window.sessionStorage?.tabId];

    const { Option } = Select;
    const { Text } = Typography;
    const [form] = Form.useForm();

    const unlockImeikSearchWorkflow = properties?.unlockImeikSearchWorkflow;
    const unlockImeikDevicehWorkflow = properties?.unlockImeikDevicehWorkflow;

    const {
        workflow: imeiSearchWorkflow,
        datasource: imeiSearchDatasource,
        errorStates: imeiSearchErrorStates,
        successStates: imeiSearchSuccessStates,
        responseMapping: imeiSearchResponseMapping,
    } = unlockImeikSearchWorkflow;
    const {
        workflow: imeiUnlockDeviceWorkflow,
        datasource: imeiUnlockDeviceDatasource,
        errorStates: imeiUnlockDeviceErrorStates,
        successStates: imeiUnlockDeviceSuccessStates,
        responseMapping: imeiUnlockDeviceResponseMapping,
    } = unlockImeikDevicehWorkflow;

    const [errMessage, setErrMessage] = useState(null);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [loadingUnlock, setLoadingUnlock] = useState(false);

    const [imeiSearchData, setImeiSearchData] = useState(undefined);
    const [deviceUnlockData, setDeviceUnlockData] = useState(undefined);
    const [unlockMessage, setUnlockMessage] = useState(undefined);
    const [showUnlockButton, setShowUnlockButton] = useState(true);
    const [showOtherReasonInput, setShowOtherReasonInput] = useState(false);
    let [unlockDevicePayload, setUnlockDevicePayload] = useState({
        imei: '',
        overrideTenure: false,
        overrideReason: null,
        overrideReasonDetails: null,
        ban: '',
        ctn: '',
    });
    const [imeiNotFound, setImeiNotFound] = useState(false);
    const [imeiSearched, setImeiSearched] = useState(undefined);
    const [showOverrideButton, setShowOverrideButton] = useState(true);
    const [showOverrideOptions, setShowOverrideOptions] = useState(true);
    const [disableOverrideButton, setDisableOverrideButton] = useState(true);

    const imeiUnlockInfo =
        imeiSearchData &&
        imeiSearchData?.find(({ device }) => {
            return device;
        })?.device?.unlockInfo;

    const tableData = getTableData(imeiSearchData);

    const handleImeiSearchResponse = (
        subscriptionId,
        topic,
        eventData,
        closure
    ) => {
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
                if (
                    eventData?.event?.data?.response?.data?.code === 'NOT_FOUND'
                ) {
                    setImeiNotFound(true);
                    setDeviceUnlockData({ deviceUnlocked: false });
                }
                if (eventData?.event?.data?.response?.data?.causedBy) {
                    setErrMessage(
                        eventData?.event?.data?.response?.data?.causedBy[0]
                            ?.message
                    );
                } else {
                    setErrMessage(
                        eventData?.event?.data?.response?.data?.message
                    );
                }
            }
            setLoadingSearch(false);
            MessageBus.unsubscribe(subscriptionId);
        }
    };

    const onFinish = (values) => {
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

            MessageBus.send('WF.'.concat(imeiSearchWorkflow).concat('.INIT'), {
                header: {
                    registrationId: imeiSearchWorkflow,
                    workflow: imeiSearchWorkflow,
                    eventType: 'INIT',
                },
            });
            MessageBus.subscribe(
                imeiSearchWorkflow,
                'WF.'.concat(imeiSearchWorkflow).concat('.STATE.CHANGE'),
                handleImeiSearchResponse
            );
            MessageBus.send(
                'WF.'
                    .concat(imeiSearchWorkflow)
                    .concat('.')
                    .concat(submitEvent),
                {
                    header: {
                        registrationId: imeiSearchWorkflow,
                        workflow: imeiSearchWorkflow,
                        eventType: submitEvent,
                    },
                    body: {
                        datasource: datasources[imeiSearchDatasource],
                        request: {
                            params: { imei: values.imei },
                        },
                        imeiSearchResponseMapping,
                    },
                }
            );
        }
    };

    const onFinishFailed = (errorInfo) => {
        console.log('Failed:', errorInfo);
    };

    const handleDeviceUnlockResponse = (
        subscriptionId,
        topic,
        eventData,
        closure
    ) => {
        const state = eventData.value;

        const isSuccess = imeiUnlockDeviceSuccessStates.includes(state);
        const isFailure = imeiUnlockDeviceErrorStates.includes(state);
        if (isSuccess || isFailure) {
            if (isSuccess) {
                setDeviceUnlockData(eventData?.event?.data?.data);
                if (
                    eventData?.event?.data?.data?.unlockCode !== undefined &&
                    eventData?.event?.data?.data?.unlockCode !== ''
                ) {
                    setUnlockMessage(
                        `${eventData?.event?.data?.data?.message} Unlock code is ${eventData?.event?.data?.data?.unlockCode}`
                    );
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
                    setErrMessage(
                        eventData?.event?.data?.response?.data?.causedBy[0]
                            ?.message
                    );
                } else {
                    setErrMessage(
                        eventData?.event?.data?.response?.data?.message
                    );
                }
            }
            setLoadingUnlock(false);
            MessageBus.unsubscribe(subscriptionId);
        }
    };

    const getDeviceUnlockInfo = () => {
        setLoadingUnlock(true);

        const submitEvent = 'SUBMIT';

        MessageBus.send(
            'WF.'.concat(imeiUnlockDeviceWorkflow).concat('.INIT'),
            {
                header: {
                    registrationId: imeiUnlockDeviceWorkflow,
                    workflow: imeiUnlockDeviceWorkflow,
                    eventType: 'INIT',
                },
            }
        );
        MessageBus.subscribe(
            imeiUnlockDeviceWorkflow,
            'WF.'.concat(imeiUnlockDeviceWorkflow).concat('.STATE.CHANGE'),
            handleDeviceUnlockResponse
        );
        MessageBus.send(
            'WF.'
                .concat(imeiUnlockDeviceWorkflow)
                .concat('.')
                .concat(submitEvent),
            {
                header: {
                    registrationId: imeiUnlockDeviceWorkflow,
                    workflow: imeiUnlockDeviceWorkflow,
                    eventType: submitEvent,
                },
                body: {
                    datasource: datasources[imeiUnlockDeviceDatasource],
                    request: {
                        body: unlockDevicePayload,
                    },
                    imeiUnlockDeviceResponseMapping,
                },
            }
        );
    };

    const overrideDeviceUnlockInfo = () => {
        // Construct payload without BAN and CTN and make unlock call.
        const requestPayloadWithoutBanCtn = {
            ...unlockDevicePayload,
        };
        delete requestPayloadWithoutBanCtn.ban;
        delete requestPayloadWithoutBanCtn.ctn;
        setLoadingUnlock(true);

        const submitEvent = 'SUBMIT';

        // Use message bus api call system and handle response accordingly
        MessageBus.send(
            'WF.'.concat(imeiUnlockDeviceWorkflow).concat('.INIT'),
            {
                header: {
                    registrationId: imeiUnlockDeviceWorkflow,
                    workflow: imeiUnlockDeviceWorkflow,
                    eventType: 'INIT',
                },
            }
        );
        MessageBus.subscribe(
            imeiUnlockDeviceWorkflow,
            'WF.'.concat(imeiUnlockDeviceWorkflow).concat('.STATE.CHANGE'),
            handleDeviceUnlockResponse
        );
        MessageBus.send(
            'WF.'
                .concat(imeiUnlockDeviceWorkflow)
                .concat('.')
                .concat(submitEvent),
            {
                header: {
                    registrationId: imeiUnlockDeviceWorkflow,
                    workflow: imeiUnlockDeviceWorkflow,
                    eventType: submitEvent,
                },
                body: {
                    datasource: datasources[imeiUnlockDeviceDatasource],
                    request: {
                        body: requestPayloadWithoutBanCtn,
                    },
                    imeiUnlockDeviceResponseMapping,
                },
            }
        );
    };

    const handleReasonChange = (value) => {
        setUnlockDevicePayload((prev) => {
            return {
                ...prev,
                imei: imeiSearched,
                overrideTenure: true,
                overrideReason: value,
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

    const handleOtherReasonChange = (e) => {
        if (e.target.value) {
            setDisableOverrideButton(false);
        } else {
            setDisableOverrideButton(true);
        }
        setUnlockDevicePayload((prev) => {
            return {
                ...prev,
                overrideTenure: true,
                overrideReasonDetails: e?.target?.value,
            };
        });
    };

    const lineSubscriberStatus =
        imeiSearchData &&
        imeiSearchData?.find(({ subscriberStatus }) => {
            return subscriberStatus;
        })?.subscriberStatus;

    function unlockImeiModalFooter() {
        let footer = [];
        let authanticateButton = (
            <Tooltip
                title={
                    imeiUnlockInfo?.allowUnlock
                        ? null
                        : imeiUnlockInfo?.resourceStatus
                }
            >
                <Button
                    type={imeiUnlockInfo?.allowUnlock ? 'primary' : 'ghost'}
                    disabled={!imeiUnlockInfo?.allowUnlock}
                    onClick={() => {
                        setShowUnlockImei(false);
                        history.push('/dashboards/cust-auth', {
                            routeData: {
                                imeiData: imeiSearchData[0],
                                searchType: 'Account',
                            },
                        });
                    }}
                >
                    AUTHENTICATE
                </Button>
            </Tooltip>
        );

        let ovierrideButton = (
            <>
                {showOverrideButton && (
                    <Button
                        type={disableOverrideButton ? 'ghost' : 'primary'}
                        onClick={() => {
                            if (imeiNotFound) {
                                overrideDeviceUnlockInfo();
                            } else {
                                getDeviceUnlockInfo();
                            }
                        }}
                        disabled={disableOverrideButton}
                        loading={loadingUnlock}
                    >
                        OVERRIDE & UNLOCK
                    </Button>
                )}
            </>
        );
        let unlockButton = (
            <Tooltip
                title={
                    imeiUnlockInfo?.allowUnlock
                        ? null
                        : imeiUnlockInfo?.resourceStatus
                }
            >
                <Button
                    type={imeiUnlockInfo?.allowUnlock ? 'primary' : 'ghost'}
                    disabled={!imeiUnlockInfo?.allowUnlock}
                    loading={loadingUnlock}
                    onClick={() => getDeviceUnlockInfo()}
                >
                    UNLOCK DEVICE
                </Button>
            </Tooltip>
        );
        let closeButton = (
            <Button type="default" onClick={() => handleUnlockImeiClose()}>
                CLOSE
            </Button>
        );

        if (imeiSearchData) {
            if (lineSubscriberStatus === 'A' || lineSubscriberStatus === 'S') {
                footer.push(authanticateButton);
            } else if (
                lineSubscriberStatus === 'C' &&
                !deviceUnlockData?.deviceUnlocked
            ) {
                if (unlockOverrideInfo?.enable && showOverrideOptions) {
                    footer.push(ovierrideButton);
                } else if (showUnlockButton) {
                    footer.push(unlockButton);
                }
            }
            footer.push(closeButton);
        } else if (
            imeiNotFound &&
            unlockOverrideInfo?.enable &&
            validProfilesForOverride.includes(profile)
        ) {
            // IMEI not found and device unlock override is enabled
            // add buttons to footer
            footer.push(ovierrideButton);
            footer.push(closeButton);
        } else {
            return null;
        }

        return footer;
    }

    useEffect(() => {
        MessageBus.subscribe(
            'SHOW_UNLOCKIMEI_TOOL',
            'SHOW_UNLOCKIMEI_TOOL',
            handleUnlockImeiToolVisibility
        );
        return () => {
            MessageBus.unsubscribe('SHOW_UNLOCKIMEI_TOOL');
        };
    }, []);
    useEffect(() => {
        if (imeiSearchData) {
            setUnlockDevicePayload((prev) => {
                return {
                    ...prev,
                    imei: tableData[0]?.imei,
                    ban: tableData[0]?.ban,
                    ctn: tableData[0]?.ctn,
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

    return (
        <>
            <Modal
                className="unlock-imei-modal"
                title={'Unlock IMEI'}
                open={visible}
                onOk={() => handleUnlockImeiClose()}
                onCancel={() => handleUnlockImeiClose()}
                width={750}
                footer={unlockImeiModalFooter()}
                forceRender={true}
                centered
            >
                <article className="imei-unlock-tool">
                    {!deviceUnlockData?.deviceUnlocked && (
                        <p>
                            Please search for the IMEI number you wish to
                            unlock. IMEI's that are ACTIVE or SUSPENDED on an
                            account must be authenticated before proceeding to
                            unlock device.
                        </p>
                    )}

                    {!deviceUnlockData?.deviceUnlocked && (
                        <div className="mg-b--16">
                            <Form
                                form={form}
                                name="basic"
                                layout="inline"
                                initialValues={{
                                    remember: false,
                                    initialValue: '',
                                }}
                                onFinish={onFinish}
                                onFinishFailed={onFinishFailed}
                                autoComplete="off"
                            >
                                <Form.Item
                                    name="imei"
                                    normalize={(value) =>
                                        value.replace(/[^0-9]/gi, '')
                                    }
                                    rules={[
                                        {
                                            required: true,
                                            validateTrigger: 'onBlur',
                                            validator: customInputValidator,
                                        },
                                    ]}
                                >
                                    <Input
                                        allowClear
                                        placeholder="Search IMEI"
                                    />
                                </Form.Item>

                                <Form.Item>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        loading={loadingSearch}
                                    >
                                        SEARCH
                                    </Button>
                                </Form.Item>
                            </Form>
                        </div>
                    )}

                    {imeiSearchData && (
                        <Table
                            columns={columns}
                            dataSource={tableData}
                            pagination={false}
                            className="mg-b--16"
                        />
                    )}

                    {deviceUnlockData && !errMessage && (
                        <div>
                            <Alert
                                message={unlockMessage}
                                type={
                                    deviceUnlockData?.deviceUnlocked
                                        ? 'success'
                                        : 'error'
                                }
                                showIcon
                            />
                        </div>
                    )}
                    {errMessage && (
                        <div>
                            <Alert
                                message={errMessage && errMessage}
                                type="error"
                                showIcon
                            />
                        </div>
                    )}

                    {unlockOverrideInfo?.enable &&
                        lineSubscriberStatus === 'C' &&
                        showOverrideOptions &&
                        imeiSearchData && (
                            <>
                                <Row justify="around">
                                    <Col className="modal-grid-child" span={8}>
                                        <Select
                                            placeholder="Select reason for override"
                                            style={{
                                                width: 200,
                                            }}
                                            onChange={handleReasonChange}
                                            className="mg-t--16"
                                        >
                                            {overrideReasons &&
                                                overrideReasons?.map(
                                                    (reason, i) => {
                                                        return (
                                                            <Option
                                                                key={i}
                                                                value={reason}
                                                            >
                                                                {reason}
                                                            </Option>
                                                        );
                                                    }
                                                )}
                                        </Select>
                                    </Col>
                                    <Col className="modal-grid-child" span={16}>
                                        {showOtherReasonInput && (
                                            <Input
                                                allowClear
                                                placeholder="Enter reason for override"
                                                onChange={
                                                    handleOtherReasonChange
                                                }
                                            />
                                        )}
                                    </Col>
                                </Row>
                            </>
                        )}
                </article>
            </Modal>
        </>
    );
}
