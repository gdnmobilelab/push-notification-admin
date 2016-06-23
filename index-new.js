import React from 'react';
import ReactDOM from 'react-dom';
import classnames from 'classnames';
import request from 'browser-request';
var CONFIG = require("./config/" + process.env.BUILD_ENV + "_config.js");
var update = require('react-addons-update');

class Notification extends React.Component {
    constructor() {
        super();

        this.timeout = null;
    }

    componentDidMount() {
        if (this.timeout ) {
            clearTimeout(this.timeout);
        }

        setTimeout(this.props.onNotificationEnd, 4000);
    }

    render() {
        var notificationColor = classnames('alert', {'alert-success': this.props.success}, {'alert-danger': !this.props.success});

        return (
            <div className={notificationColor} role="alert">{this.props.message}</div>
        )
    }
}

class AdminWebPushNotification extends React.Component {
    constructor() {
        super();

        this.state = {
            form: {
                command: "notification.show",
                options: {
                    options: {
                        notificationID: new Date().getTime(),
                        tag: new Date().getTime(),
                        data: {
                            onTap: [{"command":"notification.close","options":{}}]
                        }
                    },
                    actionCommands: []
                }
            },
            submitted: {}
        }
    }

    onChange(form) {
        this.setState(Object.assign({}, {form: form}));
    }

    sendNotification(e) {
        e.preventDefault();

        let notificationToSend = {
            ttl: CONFIG.NOTIFICATION_TTL,
            payload: [ this.state.form ]
        };

        console.log(JSON.stringify(notificationToSend));

        request({
            method: 'POST',
            url: CONFIG.API_URL,
            body: JSON.stringify(notificationToSend),
            json: true,
            headers: {
                'X-Api-Key': CONFIG.API_KEY
            }
        }, (err, result, body) => {
            if (err) {
                console.log(err);
                this.setState({submitted: { success: false, message: err.message } } );
            } else {
                var updatedState;

                if (process.env.BUILD_ENV == 'production') {
                    updatedState = {
                        form: {
                            command: "notification.show",
                            options: {
                                options: {
                                    notificationID: new Date().getTime(),
                                    tag: new Date().getTime(),
                                    data: {
                                        onTap: [{"command":"notification.close","options":{}}]
                                    }
                                },
                                actionCommands: []
                            }
                        },
                        submitted: {}
                    };
                } else {
                    updatedState = update(this.state, {
                        form: {
                            options: {
                                options: {
                                    tag: { $set: new Date().getTime() },
                                    notificationID: { $set: new Date().getTime() }
                                }
                            }
                        },
                        submitted: { success: { $set: true }, message: { $set: 'Push Notification sent successfully' } }
                    });
                }


                this.setState(updatedState);
            }
        });
    }

    isFormValid() {
        var options = this.state.form.options || {};
        var subOptions = options.options || {};

        if (!options.title) {
            return {'message': 'Missing "Notification Title" field'};
        }

        if (!subOptions.body) {
            return {'message': 'Missing "Notification Body" field'};
        }

        if (!subOptions.tag) {
            return {'message': 'Missing "Notification Tag" field'};
        }

        var onTap = subOptions.data.onTap;

        if (onTap.length < 1) {
            return {'message': 'An "On Tap" action is required'};
        }

        return true;
    }

    removeNotification() {
        this.setState(Object.assign({}, this.state, {submitted: {}}));
    }

    render() {
        var notification = '';
        if (this.state.submitted.message) {
            notification = <Notification success={this.state.submitted.success} message={this.state.submitted.message} onNotificationEnd={this.removeNotification.bind(this)} />
        }

        return (
            <div className="push-notification-admin">
                <div className="container">
                    <div className="row">
                        {notification}
                        <h1>{process.env.BUILD_ENV }: Admin Web Push Notification</h1>
                        <AdminWebPushNotificationForm isValid={this.isFormValid.bind(this)} onSubmit={this.sendNotification.bind(this)} onChange={this.onChange.bind(this)} formValue={Object.assign({}, this.state.form)} />
                    </div>
                </div>
            </div>
        )
    }
}

class AdminWebPushNotificationForm extends React.Component {
    constructor() {
        super();
    }

    render() {
        var isValidObj = this.props.isValid();
        var isValid = typeof isValidObj === 'object';
        var missingText = '';
        if (typeof isValidObj === 'object') {
            missingText = isValidObj.message;
        }

        var submit = classnames('btn', 'btn-primary', 'pull-right', {'disabled': isValid});

        return (
            <form className="form-horizontal" onSubmit={this.props.onSubmit}>
                <PushNotification onChange={this.props.onChange.bind(this)} formValue={this.props.formValue} />
                <div className="pull-right">
                    <div className="clearfix">
                        <button type="submit" className={submit} >Send Notification</button>
                    </div>
                    <div className="text-danger missing-form"><p>{missingText}</p></div>
                </div>
            </form>
        )
    }
}

class PushNotification extends React.Component {
    constructor() {
        super();
    };

    componentWillReceiveProps(nextProps) {
        this.setState(nextProps.formValue);
    }

    onChange(options) {
        var newOptions = Object.assign({}, this.props.formValue.options, options);
        this.props.onChange(Object.assign({}, this.props.formValue, {options: newOptions}));
    }

    onActionCommandsChange(actionCommands) {
        var newOptions = Object.assign({}, this.props.formValue.options, {actionCommands: actionCommands});
        this.props.onChange(Object.assign({}, this.props.formValue, {options: newOptions}));
    }

    render() {
        return (
            <div>
                <div className="well bs-component">
                    <legend>Notification</legend>
                    <Input onChange={this.onChange.bind(this)} select="title" formValue={this.props.formValue.options} label="Notification title" />
                    <PushNotificationOptions onChange={this.onChange.bind(this)} formValue={this.props.formValue.options} select="options" />
                </div>
                <ActionButtons onChange={this.onActionCommandsChange.bind(this)} formValue={this.props.formValue.options.actionCommands} />
            </div>
        )
    }
}

class ActionButtons extends React.Component {
    constructor() {
        super();
    }

    addAction() {
        var activeActions = this.props.formValue.slice(0);
        activeActions.push({
            commands: [],
            template: {}
        });
        this.props.onChange(activeActions)
    }

    removeAction(index) {
        return () => {
            var activeActions = this.props.formValue.slice(0);
            activeActions.splice(index, 1);
            this.props.onChange(activeActions);
        }
    }

    modifyAction(index) {
        return (newValue) => {
            var activeActions = this.props.formValue.slice(0);
            activeActions[index] = newValue;
            this.props.onChange(activeActions);
        }
    }

    render() {
        var activeActions = this.props.formValue;
        var toShow;

        if (activeActions.length < 1) {
            toShow = <div className="well bs-component"><button type="button" onClick={this.addAction.bind(this)} className="btn btn-default">Enable Action One</button></div>
        } else if (activeActions.length == 1) {
            toShow =
                <div>
                    <div className="well bs-component">
                        <button type="button" onClick={this.removeAction(0).bind(this)} className="btn btn-danger">Disable Action One</button>
                        <ActionButton onChange={this.modifyAction(0).bind(this)} label="Action One" key="action-button-one" formValue={this.props.formValue[0]} />
                    </div>
                    <div className="well bs-component">
                        <button type="button" className="btn btn-default" onClick={this.addAction.bind(this)}>Enable Action Two</button>
                    </div>
                </div>
        } else {
            toShow = <div>
                <div className="well bs-component">
                    <ActionButton onChange={this.modifyAction(0).bind(this)} label="Action One" key="action-button-one" formValue={this.props.formValue[0]} />
                </div>
                <div className="well bs-component">
                    <button type="button" onClick={this.removeAction(1).bind(this)} className="btn btn-danger">Disable Action Two</button>
                    <ActionButton onChange={this.modifyAction(1).bind(this)} label="Action Two" key="action-button-one" formValue={this.props.formValue[1]} />
                </div>
            </div>
        }

        return (
            <div>
                {toShow}
            </div>
        )
    }
}

class ActionButton extends React.Component {
    constructor() {
        super();
    }

    onInputChange(value) {
        var newTemplate = Object.assign({}, this.props.formValue.template, value);
        this.props.onChange(Object.assign({}, this.props.formValue, {template: newTemplate}));
    }

    onChangeTapActions(toChange) {
        this.props.onChange(Object.assign({}, this.props.formValue, { commands: toChange }));
    }

    render() {
        /*<ImageUpload formValue={this.props.formValue.template} label="Icon" select="icon" onChange={this.onInputChange.bind(this)} />*/
        return (
            <div>
                <h3>{this.props.label}</h3>
                <Input select="title" onChange={this.onInputChange.bind(this)} formValue={this.props.formValue.template} label="Title" />
                <Input select="icon" onChange={this.onInputChange.bind(this)} formValue={this.props.formValue.template} label="Icon" />
                <PushNotificationTapActions onChange={this.onChangeTapActions.bind(this)} formValue={this.props.formValue.commands} />
            </div>
        )
    }
}

class PushNotificationOptions extends React.Component {
    constructor() {
        super();
    }

    componentWillReceiveProps(nextProps) {
        this.setState(nextProps.formValue);
    }

    onChange(options) {
        this.props.onChange(Object.assign({}, this.props.formValue, {options: Object.assign({}, this.props.formValue.options, options)}))
    }

    onChangeTapActions(toChange) {
        var newOptions = Object.assign({}, this.props.formValue.options, { data: { onTap: toChange } });
        this.props.onChange(Object.assign({}, this.props.formValue, {options: newOptions }));
    }

    render() {
        /*<ImageUpload formValue={this.props.formValue.options} label="Notification icon" select="icon" onChange={this.onChange.bind(this)} />*/
        return (
            <div>
                <TextArea select="body" onChange={this.onChange.bind(this)} formValue={this.props.formValue.options} select="body" label="Notification body" />
                <Input select="icon" onChange={this.onChange.bind(this)} formValue={this.props.formValue.options} label="Notification icon" />
                <Input disabled={true} select="tag" onChange={this.onChange.bind(this)} formValue={this.props.formValue.options} label="Notification tag" />
                <PushNotificationTapActions onChange={this.onChangeTapActions.bind(this)} formValue={this.props.formValue.options.data.onTap} />
            </div>
        )
    }
}

class PushNotificationTapActionOptions extends React.Component {
    constructor(props) {
        super();
    }

    onChange(value) {
        this.props.onChange(Object.assign({}, value));
    }

    render() {
        return (
            <div className="card">
                <div className="row options">
                    <Input onChange={this.onChange.bind(this)} select={this.props.select} formValue={this.props.formValue} label={this.props.label} />
                </div>
            </div>
        )
    }
}

class PushNotificationTapActions extends React.Component {
    constructor(props) {
        super();
    }

    getButtonClasses(id) {
        var classes = 'btn btn-default';

        if (typeof this.props.formValue.find((c) => { return c.command == id }) !== 'undefined') {
            classes += ' btn-success';
        }

        return classes;
    }

    updateOption(command) {
        return (options) => {
            var commandIndex = this.props.formValue.findIndex((c) => {
                return c.command == command.command
            });
            var newCommands = this.props.formValue.slice(0);
            command.options = options
            newCommands[commandIndex] = command;
            this.props.onChange(newCommands);
        };

    }

    findAction(id) {
        var actions = this.props.formValue.slice(0);

        return actions.find((c) => {
            return c.command == id
        });
    }

    toggleAction(id) {
        return () => {
            var actions = this.props.formValue.slice(0);
            var isActionActive = this.findAction(id);

            if (typeof isActionActive !== 'undefined') {
                this.props.onChange(actions.filter((c) => {
                    return c.command != id
                }))
            } else {
                actions.push({command: id, options: {}});
                this.props.onChange(actions)
            }
        }
    }

    componentDidMount() {
        //If we just mounted and notification.close
        //isn't in the list of commands, add it.
        var isActionActive = this.findAction('notification.close');

        if (typeof isActionActive === 'undefined') {
            this.toggleAction('notification.close')()
        }
    }

    render() {
        var openURL = this.props.formValue.find((c) => { return c.command == 'browser.openURL' });
        var subToTopic = this.props.formValue.find((c) => { return c.command == 'pushy.subscribeToTopic' });
        var showOpenURL = openURL ?
            <PushNotificationTapActionOptions onChange={this.updateOption(openURL).bind(this)} label="URL" select="url" formValue={openURL.options} />
            : '';
        var showSubToTopic = subToTopic ?
            <PushNotificationTapActionOptions onChange={this.updateOption(subToTopic).bind(this)} label="Topic" select="topic" formValue={subToTopic.options} />
            : '';

        return (
            <div className="form-group">
                <label className="col-lg-2 control-label">On Tap (at least one action required)</label>
                <div className="col-lg-10">
                    <div className="commands-to-add">
                        <a className={this.getButtonClasses('notification.close')} href="javascript:void(0)" onClick={this.toggleAction('notification.close').bind(this)}>Close Notification</a>
                        <a className={this.getButtonClasses('browser.openURL')} href="javascript:void(0)" onClick={this.toggleAction('browser.openURL').bind(this)}>Open URL</a>
                        <a className={this.getButtonClasses('pushy.subscribeToTopic')} onClick={this.toggleAction('pushy.subscribeToTopic').bind(this)}>Subscribe to Topic</a>
                    </div>
                    <div className="active-commands">
                        {showOpenURL}
                        {showSubToTopic}
                    </div>
                </div>
            </div>
        )
    }
}

class Input extends React.Component {
    onChange(e) {
        this.props.onChange({[this.props.select]: e.target.value});
    }

    render() {
        return (
            <div className="form-group">
                <label className="col-lg-2 control-label">{this.props.label}</label>
                <div className="col-lg-10">
                    <input disabled={this.props.disabled} onChange={this.onChange.bind(this)} placeholder={this.props.label} className="form-control" type="text" value={this.props.formValue[[this.props.select]] || ''} />
                </div>
            </div>
        )
    }
}

class TextArea extends React.Component {
    onChange(e) {
        this.props.onChange({[this.props.select]: e.target.value});
    }

    render() {
        return (
            <div className="form-group">
                <label className="col-lg-2 control-label">{this.props.label}</label>
                <div className="col-lg-10">
                    <textarea onChange={this.onChange.bind(this)} className="form-control"  value={this.props.formValue[[this.props.select]] || ''}></textarea>
                </div>
            </div>
        )
    }
}

ReactDOM.render(<AdminWebPushNotification />, document.getElementById('push-notification-admin-mount-node'));