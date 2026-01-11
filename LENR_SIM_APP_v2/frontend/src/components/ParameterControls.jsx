import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  InputNumber, 
  Slider, 
  Select, 
  Switch,
  Divider, 
  Button, 
  Tooltip, 
  Space,
  Typography,
  Row,
  Col,
  Alert
} from 'antd';
import {
  SettingOutlined,
  SaveOutlined,
  ReloadOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';

const { Title } = Typography;
const { Option } = Select;

/**
 * Component for simulation parameter controls
 * 
 * @param {Object} props Component props
 * @param {Object} props.initialParameters Initial parameter values
 * @param {Function} props.onParametersChange Callback for parameter changes
 * @param {Function} props.onStartSimulation Callback for starting simulation
 * @param {boolean} props.disabled Whether controls are disabled
 * @param {string} props.mode Simulation mode ('basic', 'advanced', 'expert')
 */
const ParameterControls = ({
  initialParameters = {},
  onParametersChange = () => {},
  onStartSimulation = () => {},
  disabled = false,
  mode = 'basic'
}) => {
  const [form] = Form.useForm();
  const [, setParameters] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [advancedMode, setAdvancedMode] = useState(mode === 'advanced' || mode === 'expert');
  const [expertMode, setExpertMode] = useState(mode === 'expert');
  
  // Memoize stringified initialParameters to prevent infinite re-renders
  const initialParamsString = useMemo(() => JSON.stringify(initialParameters), [initialParameters]);
  const hasInitialized = useRef(false);
  
  // Initialize form with initial parameters
  useEffect(() => {
    // Only initialize once or when initialParameters actually changes
    const parsedParams = JSON.parse(initialParamsString);
    
    if (parsedParams && Object.keys(parsedParams).length > 0) {
      form.setFieldsValue(parsedParams);
      setParameters(parsedParams);
      hasInitialized.current = true;
    } else if (!hasInitialized.current) {
      // Set default values only on first mount
      const defaultValues = {
        // Basic parameters
        latticeType: 'FCC',
        latticeConstant: 3.89,
        temperature: 300,
        pressure: 1.0,
        deuteriumLoading: 0.6,
        
        // Advanced parameters
        dimensions: [10, 10, 10],
        defectConcentration: 0.01,
        enhancementFactor: 1.0,
        
        // Expert parameters
        potentialModel: 'morse',
        electronScreening: true,
        phononCoupling: true,
        quantumEffects: true
      };
      
      form.setFieldsValue(defaultValues);
      setParameters(defaultValues);
      hasInitialized.current = true;
    }
  }, [initialParamsString, form]);
  
  // Handle form value changes
  const handleValuesChange = (changedValues, allValues) => {
    setParameters(allValues);
    onParametersChange(allValues);
  };
  
  // Handle form submission
  const handleSubmit = () => {
    form.validateFields()
      .then(values => {
        setFormErrors({});
        onStartSimulation(values);
      })
      .catch(errorInfo => {
        setFormErrors(
          errorInfo.errorFields.reduce((result, field) => {
            result[field.name[0]] = field.errors[0];
            return result;
          }, {})
        );
      });
  };
  
  // Reset form to initial values
  const handleReset = () => {
    if (initialParameters && Object.keys(initialParameters).length > 0) {
      form.setFieldsValue(initialParameters);
      setParameters(initialParameters);
    } else {
      form.resetFields();
    }
  };
  
  return (
    <Card
      title={
        <Space>
          <SettingOutlined />
          <span>Simulation Parameters</span>
        </Space>
      }
      extra={
        <Space>
          <Tooltip title="Toggle Advanced Parameters">
            <Switch
              checkedChildren="Advanced"
              unCheckedChildren="Basic"
              checked={advancedMode}
              onChange={checked => setAdvancedMode(checked)}
              disabled={disabled}
            />
          </Tooltip>
          
          {advancedMode && (
            <Tooltip title="Toggle Expert Parameters">
              <Switch
                checkedChildren="Expert"
                unCheckedChildren="Advanced"
                checked={expertMode}
                onChange={checked => setExpertMode(checked)}
                disabled={disabled}
              />
            </Tooltip>
          )}
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleValuesChange}
        disabled={disabled}
      >
        {/* Basic Parameters */}
        <Title level={5}>Basic Parameters</Title>
        
        <Row gutter={[16, 0]}>
          <Col xs={24} sm={12} md={8}>
            <Form.Item
              name="latticeType"
              label={
                <Space>
                  <span>Lattice Type</span>
                  <Tooltip title="Crystal structure type for the simulation">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </Space>
              }
              rules={[{ required: true, message: 'Please select a lattice type' }]}
            >
              <Select>
                <Option value="FCC">Face-Centered Cubic (FCC)</Option>
                <Option value="BCC">Body-Centered Cubic (BCC)</Option>
                <Option value="HCP">Hexagonal Close-Packed (HCP)</Option>
                <Option value="Diamond">Diamond Cubic</Option>
              </Select>
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12} md={8}>
            <Form.Item
              name="latticeConstant"
              label={
                <Space>
                  <span>Lattice Constant (Å)</span>
                  <Tooltip title="Lattice constant in Angstroms">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </Space>
              }
              rules={[
                { required: true, message: 'Please enter a lattice constant' },
                { type: 'number', min: 0.1, max: 10, message: 'Value must be between 0.1 and 10 Å' }
              ]}
            >
              <InputNumber
                min={0.1}
                max={10}
                step={0.01}
                precision={3}
                style={{ width: '100%' }}
                addonAfter="Å"
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12} md={8}>
            <Form.Item
              name="temperature"
              label={
                <Space>
                  <span>Temperature (K)</span>
                  <Tooltip title="Simulation temperature in Kelvin">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </Space>
              }
              rules={[
                { required: true, message: 'Please enter a temperature' },
                { type: 'number', min: 1, max: 2000, message: 'Value must be between 1 and 2000 K' }
              ]}
            >
              <InputNumber
                min={1}
                max={2000}
                style={{ width: '100%' }}
                addonAfter="K"
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12} md={12}>
            <Form.Item
              name="pressure"
              label={
                <Space>
                  <span>Pressure (atm)</span>
                  <Tooltip title="Ambient pressure in atmospheres">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </Space>
              }
              rules={[
                { required: true, message: 'Please enter a pressure' },
                { type: 'number', min: 0.01, max: 1000, message: 'Value must be between 0.01 and 1000 atm' }
              ]}
            >
              <Slider
                min={0.01}
                max={1000}
                step={0.01}
                marks={{
                  0.01: '0.01',
                  1: '1',
                  10: '10',
                  100: '100',
                  1000: '1000'
                }}
                tooltip={{
                  formatter: value => `${value} atm`
                }}
                scale={value => Math.log10(value) * 333.33 + 333.33} // Logarithmic scale for better UX
                getAriaValueText={value => `${value} atm`}
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} sm={12} md={12}>
            <Form.Item
              name="deuteriumLoading"
              label={
                <Space>
                  <span>Deuterium Loading Ratio (D/Pd)</span>
                  <Tooltip title="Ratio of deuterium atoms to palladium atoms">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </Space>
              }
              rules={[
                { required: true, message: 'Please enter a loading ratio' },
                { type: 'number', min: 0, max: 1, message: 'Value must be between 0 and 1' }
              ]}
            >
              <Slider
                min={0}
                max={1}
                step={0.01}
                marks={{
                  0: '0',
                  0.2: '0.2',
                  0.4: '0.4',
                  0.6: '0.6',
                  0.8: '0.8',
                  1: '1'
                }}
                tooltip={{
                  formatter: value => `${value.toFixed(2)}`
                }}
              />
            </Form.Item>
          </Col>
        </Row>
        
        {/* Advanced Parameters (shown only when advancedMode is true) */}
        {advancedMode && (
          <>
            <Divider />
            <Title level={5}>Advanced Parameters</Title>
            
            <Row gutter={[16, 0]}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="dimensions"
                  label={
                    <Space>
                      <span>Lattice Dimensions</span>
                      <Tooltip title="Dimensions of the simulation box in unit cells">
                        <QuestionCircleOutlined />
                      </Tooltip>
                    </Space>
                  }
                  rules={[
                    { required: true, message: 'Please enter dimensions' }
                  ]}
                >
                  <Input 
                    placeholder="Format: x,y,z (e.g., 10,10,10)" 
                    onChange={(e) => {
                      const val = e.target.value;
                      const dims = val.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
                      if (dims.length === 3) {
                        form.setFieldsValue({ dimensions: dims });
                      }
                    }}
                  />
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12}>
                <Form.Item
                  name="defectConcentration"
                  label={
                    <Space>
                      <span>Defect Concentration</span>
                      <Tooltip title="Fraction of lattice sites with defects">
                        <QuestionCircleOutlined />
                      </Tooltip>
                    </Space>
                  }
                  rules={[
                    { required: true, message: 'Please enter defect concentration' },
                    { type: 'number', min: 0, max: 0.5, message: 'Value must be between 0 and 0.5' }
                  ]}
                >
                  <Slider
                    min={0}
                    max={0.5}
                    step={0.001}
                    marks={{
                      0: '0',
                      0.1: '0.1',
                      0.2: '0.2',
                      0.3: '0.3',
                      0.4: '0.4',
                      0.5: '0.5'
                    }}
                    tooltip={{
                      formatter: value => `${value.toFixed(3)}`
                    }}
                  />
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12}>
                <Form.Item
                  name="enhancementFactor"
                  label={
                    <Space>
                      <span>Enhancement Factor</span>
                      <Tooltip title="Screening enhancement factor for fusion rates">
                        <QuestionCircleOutlined />
                      </Tooltip>
                    </Space>
                  }
                  rules={[
                    { required: true, message: 'Please enter an enhancement factor' },
                    { type: 'number', min: 1, max: 1000, message: 'Value must be between 1 and 1000' }
                  ]}
                >
                  <InputNumber
                    min={1}
                    max={1000}
                    step={1}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}
        
        {/* Expert Parameters (shown only when expertMode is true) */}
        {expertMode && (
          <>
            <Divider />
            <Title level={5}>Expert Parameters</Title>
            
            <Row gutter={[16, 0]}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="potentialModel"
                  label={
                    <Space>
                      <span>Potential Model</span>
                      <Tooltip title="Mathematical model for interatomic potentials">
                        <QuestionCircleOutlined />
                      </Tooltip>
                    </Space>
                  }
                  rules={[
                    { required: true, message: 'Please select a potential model' }
                  ]}
                >
                  <Select>
                    <Option value="morse">Morse Potential</Option>
                    <Option value="lennard-jones">Lennard-Jones</Option>
                    <Option value="yukawa">Yukawa (Screened Coulomb)</Option>
                    <Option value="harmonic">Harmonic Oscillator</Option>
                  </Select>
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12}>
                <Form.Item
                  name="electronScreening"
                  label={
                    <Space>
                      <span>Electron Screening</span>
                      <Tooltip title="Include electron screening effects">
                        <QuestionCircleOutlined />
                      </Tooltip>
                    </Space>
                  }
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12}>
                <Form.Item
                  name="phononCoupling"
                  label={
                    <Space>
                      <span>Phonon Coupling</span>
                      <Tooltip title="Include phonon-assisted tunneling effects">
                        <QuestionCircleOutlined />
                      </Tooltip>
                    </Space>
                  }
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12}>
                <Form.Item
                  name="quantumEffects"
                  label={
                    <Space>
                      <span>Quantum Effects</span>
                      <Tooltip title="Include quantum tunneling effects">
                        <QuestionCircleOutlined />
                      </Tooltip>
                    </Space>
                  }
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}
        
        {/* Error Display */}
        {Object.keys(formErrors).length > 0 && (
          <Alert
            message="Validation Errors"
            description={
              <ul>
                {Object.entries(formErrors).map(([field, error]) => (
                  <li key={field}>{error}</li>
                ))}
              </ul>
            }
            type="error"
            showIcon
            style={{ marginTop: 16, marginBottom: 16 }}
          />
        )}
        
        {/* Action Buttons */}
        <div style={{ marginTop: 24, textAlign: 'right' }}>
          <Space>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={handleReset}
              disabled={disabled}
            >
              Reset
            </Button>
            <Button 
              icon={<SaveOutlined />} 
              onClick={() => {
                // Save current settings functionality would go here
              }}
              disabled={disabled}
            >
              Save Settings
            </Button>
            <Button 
              type="primary" 
              onClick={handleSubmit}
              disabled={disabled}
            >
              Start Simulation
            </Button>
          </Space>
        </div>
      </Form>
    </Card>
  );
};

export default ParameterControls; 