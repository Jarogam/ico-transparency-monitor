import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Row, Col } from 'react-flexbox-grid';
import { ModalContainer, ModalDialog } from 'react-modal-dialog';
import { connect } from 'react-redux';
import { computeICOTransparency, criticalToTransparencyLevel, icoTransparencyMap } from '../utils';
import { onModalClose } from '../actions/ModalAction';
import config from '../config';

class ContentTable extends Component {
  constructor({ currentICO }) {
    super();
    this.state = {
      matrix: {},
      issuesArray: {},
      decision: '',
    };
    this.currentICO = currentICO;
  }

  componentWillMount() {
    const result = computeICOTransparency(this.currentICO.matrix);

    this.setState({
      matrix: this.currentICO.matrix,
      issuesArray: result[1],
      decision: result[0],
    });
  }

  getRowClassName(key) {
    return this.state.issuesArray[key] ? `${criticalToTransparencyLevel(config.matrix[key].critical)}-row` : '';
  }

  getAlertClassName(key) {
    return this.state.issuesArray[key] ? `${criticalToTransparencyLevel(config.matrix[key].critical)}-alert` : '';
  }

  render() {
    return (
      <div className="modal-container">
        <Row>
          <div className="modal-title-container">
            <div className="modal-title">
              <h3> {this.currentICO.information.name}</h3>
              <p className="ico-paragraph">
                These criteria are chosen based on the concept of
                trustless-trust. You can read more about it &nbsp;
                <a href="https://github.com/Neufund/ico-transparency-monitor#adding-custom-icos-to-the-transparency-monitor" target="_blank" rel="noopener noreferrer">here</a>
                &nbsp;If you want to submit new criteria please do it via github&nbsp;<a href="https://github.com/Neufund/ico-transparency-monitor#adding-custom-icos-to-the-transparency-monitor" target="_black" rel="noopener noreferrer">here</a>.
              </p>
            </div>
            <div className="modal-title-button">
              <button className={`transparency-button ${this.state.decision}-status`}>
                <p>Transparency score</p>
                <strong>{icoTransparencyMap[this.state.decision.toUpperCase()]} </strong>
              </button>
            </div>
          </div>
        </Row>
        <Row>
          <Col md={12}>

            <table className="pure-table">
              <thead />
              <tbody>
                {Object.keys(config.matrix).map((key, index) => {
                  const currentQuestion = this.state.matrix[key];
                  const mappedQuestionMatrix = config.matrix[key];

                  return (<tr key={`${key}`}>
                    <td className={this.getRowClassName(key)}>
                      {mappedQuestionMatrix.question}
                      <p className={`alert-error ${this.getAlertClassName(key)}`}>{currentQuestion.comment}</p>
                    </td>
                    <th>
                      {/* eslint-disable */}
                      <p>{currentQuestion.answer === null ? 'N/A' : (currentQuestion.answer ? 'Yes' : 'No')}</p>
                      {/* eslint-enable */}
                    </th>
                  </tr>);
                })}
              </tbody>
            </table>
          </Col>
        </Row>
      </div>
    );
  }
}

const ModalContent = ({ message, isError }) => (
  <div className="modal-content">
    {isError && <h3>Ups we have a problem</h3>}
    <ul>
      {message.map(item => <li key={item}>{item}</li>)}
    </ul>
    {isError && <a href="/" >Reload</a>}
  </div>);

ModalContent.propTypes = {
  message: PropTypes.arrayOf(PropTypes.string).isRequired,
  isError: PropTypes.bool.isRequired,
};

ModalContent.defaultProps = {
  isError: false,
};

// eslint-disable-next-line
class MessageBoxModal extends Component {
  render() {
    const { showModal, onModalCloseCallback, messageType, currentICO, message } = this.props;

    if (!showModal) {
      return null;
    }

    if (messageType === 'SHOW_MODAL_MESSAGE') {
      return (
        <ModalContainer onClose={onModalCloseCallback}>
          <ModalDialog onClose={onModalCloseCallback}>
            <ModalContent message={message} />
          </ModalDialog>
        </ModalContainer>);
    } else if (messageType === 'SHOW_MODAL_ERROR') {
      return (
        <ModalContainer>
          <ModalDialog>
            <ModalContent message={message} isError />
          </ModalDialog>
        </ModalContainer>);
    }

    if (Object.keys(currentICO).length > 0) {
      return (
        <ModalContainer onClose={onModalCloseCallback}>
          <ModalDialog onClose={onModalCloseCallback}>
            <ContentTable currentICO={currentICO} />
          </ModalDialog>
        </ModalContainer>);
    }

    return null;
  }
}

const mapStateToProps = state => ({
  showModal: state.modal.showModal,
  currentICO: state.modal.currentICO,
  messageType: state.modal.messageType,
  message: state.modal.message,
});

const mapDispatchToProps = dispatch => ({
  onModalCloseCallback: () => dispatch(onModalClose()),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(MessageBoxModal);
