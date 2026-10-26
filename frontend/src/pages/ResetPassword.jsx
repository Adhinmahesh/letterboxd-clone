import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './ResetPassword.css'

function ResetPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1: Request Code, 2: Enter OTP & New Password
  const [emailInput, setEmailInput] = useState('')
  const [targetEmail, setTargetEmail] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
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

  // Step 1: Send Password Reset Code
  const handleRequestCode = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!emailInput.trim()) {
      setError('Please enter your email address or username')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('https://letterboxd-clone-l6rs.onrender.com/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.trim() })
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Failed to send password reset code')
      }

      setTargetEmail(data.email)
      setMaskedEmail(data.maskedEmail || data.email)
      setStep(2)
      setResendCooldown(60)
      setSuccess(data.message || 'Password reset code sent!')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Resend code in Step 2
  const handleResendCode = async () => {
    if (resendCooldown > 0 || loading) return
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const res = await fetch('https://letterboxd-clone-l6rs.onrender.com/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail || emailInput.trim() })
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Failed to resend code')
      }

      setResendCooldown(60)
      setSuccess('A new verification code has been sent!')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Submit OTP & New Password
  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!otp.trim() || otp.length !== 6) {
      setError('Please enter the 6-digit verification code')
      return
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('https://letterboxd-clone-l6rs.onrender.com/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          otp: otp.trim(),
          newPassword
        })
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Password reset failed')
      }

      setSuccess('Password reset successfully! Redirecting to sign in...')
      setTimeout(() => {
        navigate('/login')
      }, 1500)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="reset-page">
      <div className="reset-wrapper">
        <div className="reset-card">
          <div className="reset-content">
            {/* Logo */}
            <div className="reset-logo">
              <span className="logo-dot orange"></span>
              <span className="logo-dot green"></span>
              <span className="logo-dot blue"></span>
            </div>

            <h1>{step === 1 ? 'Reset Password' : 'Set New Password'}</h1>

            {step === 1 ? (
              <div className="reset-prompt">
                <span>Remember your password?</span>
                <Link to="/login">Sign in</Link>
              </div>
            ) : (
              <p className="reset-step-subtitle">
                Enter the 6-digit code sent to <strong>{maskedEmail}</strong> and your new password.
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

            {/* STEP 1: Enter email/username to request reset code */}
            {step === 1 && (
              <form className="reset-form" onSubmit={handleRequestCode}>
                <div className="form-group">
                  <label htmlFor="emailInput">Username or Email</label>
                  <input
                    type="text"
                    id="emailInput"
                    name="emailInput"
                    autoComplete="username"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Enter your username or email"
                    required
                    disabled={loading}
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  className="reset-button"
                  disabled={loading}
                >
                  {loading ? 'SENDING CODE...' : 'SEND RESET CODE'}
                </button>
              </form>
            )}

            {/* STEP 2: Enter OTP & New Password */}
            {step === 2 && (
              <form className="reset-form" onSubmit={handleResetPassword}>
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
                    onClick={handleResendCode}
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
                    Change account
                  </button>
                </div>

                <div className="form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={6}
                    placeholder="At least 6 characters"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm New Password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={6}
                    placeholder="Re-enter new password"
                    required
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  className="reset-button"
                  disabled={loading || otp.length !== 6 || !newPassword}
                >
                  {loading ? 'RESETTING PASSWORD...' : 'RESET PASSWORD'}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="reset-footer">
          <Link to="/login">Back to Sign In</Link>
          <a href="#">Help & Support</a>
          <a href="#">Privacy</a>
        </div>
      </div>
    </main>
  )
}

export default ResetPassword
