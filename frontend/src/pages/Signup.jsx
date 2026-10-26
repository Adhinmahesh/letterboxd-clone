import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './Signup.css'

function Signup() {
  const [formData, setFormData] = useState({ email: '', username: '', password: '' })
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState(1) // 1: Details, 2: OTP verification
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [resendCooldown])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // Step 1: Request OTP
  const handleRequestOTP = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const res = await fetch('https://letterboxd-clone-l6rs.onrender.com/api/auth/send-signup-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Failed to send verification code')
      }

      setStep(2)
      setResendCooldown(60) // 60s cooldown
      setSuccess(`Verification code sent to ${formData.email}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Resend OTP
  const handleResendOTP = async () => {
    if (resendCooldown > 0 || loading) return
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const res = await fetch('https://letterboxd-clone-l6rs.onrender.com/api/auth/send-signup-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Failed to resend verification code')
      }

      setResendCooldown(60)
      setSuccess(`New verification code sent to ${formData.email}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Verify OTP and Register
  const handleVerifyAndRegister = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!otp.trim()) {
      setError('Please enter the 6-digit verification code')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('https://letterboxd-clone-l6rs.onrender.com/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          otp: otp.trim()
        })
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Verification failed')
      }

      setSuccess('Account verified and created successfully! Redirecting...')
      localStorage.setItem('token', data.token)
      localStorage.setItem('username', data.user.username)
      if (data.user.id) localStorage.setItem('userId', data.user.id)

      setTimeout(() => {
        window.location.href = '/'
      }, 1200)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="signup-page">
      <div className="signup-wrapper">
        <div className="signup-card">
          <div className="signup-content">
            {/* Letterboxd logo dots */}
            <div className="signup-logo">
              <span className="logo-dot orange"></span>
              <span className="logo-dot green"></span>
              <span className="logo-dot blue"></span>
            </div>

            <h1>{step === 1 ? 'Join Letterboxd' : 'Verify Your Email'}</h1>

            {step === 1 ? (
              <div className="login-prompt">
                <span>Already have a Letterboxd account?</span>
                <Link to="/login">Sign in</Link>
              </div>
            ) : (
              <p className="otp-step-subtitle">
                We sent a 6-digit code to <strong>{formData.email}</strong>. Enter it below to complete your registration.
              </p>
            )}

            {/* Error & Success Messages */}
            {success && (
              <div className="auth-alert success-alert">
                {success}
              </div>
            )}
            {error && (
              <div className="auth-alert error-alert">
                {error}
              </div>
            )}

            {/* STEP 1: Registration Form */}
            {step === 1 && (
              <form className="signup-form" onSubmit={handleRequestOTP}>
                {/* Email */}
                <div className="form-group">
                  <label htmlFor="email">Email address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </div>

                {/* Username */}
                <div className="form-group">
                  <label htmlFor="username">Username</label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    autoComplete="username"
                    value={formData.username}
                    onChange={handleChange}
                    minLength={3}
                    required
                    disabled={loading}
                  />
                </div>

                {/* Password */}
                <div className="form-group">
                  <label htmlFor="password">Password (min 6 characters)</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={handleChange}
                    minLength={6}
                    required
                    disabled={loading}
                  />
                </div>

                {/* Terms */}
                <label className="checkbox-group">
                  <input type="checkbox" name="terms" required disabled={loading} />
                  <span>
                    I'm at least 16 years old and accept the{' '}
                    <a href="#">Terms of Use</a>.
                  </span>
                </label>

                {/* Privacy */}
                <label className="checkbox-group">
                  <input type="checkbox" name="privacy" required disabled={loading} />
                  <span>
                    I accept the <a href="#">Privacy Policy</a> and consent to the processing of my personal information in accordance with it.
                  </span>
                </label>

                <button
                  type="submit"
                  className="signup-button"
                  disabled={loading}
                >
                  {loading ? 'SENDING VERIFICATION CODE...' : 'CREATE ACCOUNT'}
                </button>
              </form>
            )}

            {/* STEP 2: OTP Verification Form */}
            {step === 2 && (
              <form className="signup-form" onSubmit={handleVerifyAndRegister}>
                <div className="form-group">
                  <label htmlFor="otp" style={{ textAlign: 'center' }}>
                    Enter 6-Digit Code
                  </label>
                  <input
                    type="text"
                    id="otp"
                    name="otp"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="otp-input"
                    required
                    autoFocus
                    disabled={loading}
                  />
                </div>

                <div className="otp-actions-row">
                  <button
                    type="button"
                    className="otp-link-btn"
                    onClick={handleResendOTP}
                    disabled={resendCooldown > 0 || loading}
                  >
                    {resendCooldown > 0
                      ? `Resend code in ${resendCooldown}s`
                      : 'Resend code'}
                  </button>

                  <button
                    type="button"
                    className="otp-link-btn secondary"
                    onClick={() => {
                      setStep(1)
                      setError('')
                      setSuccess('')
                    }}
                    disabled={loading}
                  >
                    Change email
                  </button>
                </div>

                <button
                  type="submit"
                  className="signup-button"
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? 'VERIFYING...' : 'VERIFY & CREATE ACCOUNT'}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="signup-footer">
          <a href="#">Terms</a>
          <a href="#">Privacy Policy</a>
          <a href="#">Contact</a>
        </div>
      </div>
    </main>
  )
}

export default Signup